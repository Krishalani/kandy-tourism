import { Injectable, afterNextRender, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { apiErrorCode, apiErrorMessage, apiProblem, hasStatus, isUnreachable } from '../api/api';
import { SAMPLE_DAY_SLUGS } from '../data/site-content';
import { AttractionSummary } from '../models/attraction.model';
import {
  AddToPlanResult,
  GeoPoint,
  GuestPlanRef,
  Itinerary,
  ResolvedStart,
  StartPoint,
} from '../models/trip-plan.model';
import {
  MAX_ITINERARY_STOPS,
  buildGoogleMapsDirectionsUrl,
  moveItem,
  numberStops,
  summarizeItinerary,
  toResolvedStart,
} from '../utils/route-planner';
import { BrowserStorageService } from './browser-storage.service';
import { ItineraryApiService, UpdateStartRequest } from './itinerary-api.service';
import { ToastService } from './toast.service';

/** The only plan data kept in the browser: a reference to the server-side guest itinerary. */
export const GUEST_PLAN_STORAGE_KEY = 'kdtp.guest-plan.v2';
/** The frontend prototype stored the whole plan here; it is no longer used. */
const LEGACY_STORAGE_KEY = 'kdtp.trip-plan.v1';

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

type Change = (itinerary: Itinerary) => Itinerary;

/**
 * Single source of truth for the tourist's itinerary, persisted by the Web API. The header,
 * Explore, Attraction Details and My Plan all read from here, so the list, map preview and
 * Google Maps link always use the same order.
 *
 * Changes are shown immediately and saved in the order they were made. The server's response
 * is authoritative: if a save fails, the plan returns to the last state the server confirmed
 * and the tourist is told what happened.
 */
@Injectable({ providedIn: 'root' })
export class TripPlanService {
  private readonly api = inject(ItineraryApiService);
  private readonly storage = inject(BrowserStorageService);
  private readonly toast = inject(ToastService);

  private ref: GuestPlanRef | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly pending = signal(0);
  /** Last state confirmed by the server. */
  private readonly confirmed = signal<Itinerary | null>(null);
  /** What the UI shows: the confirmed state plus changes that are still being saved. */
  private readonly view = signal<Itinerary | null>(null);
  /** Device location chosen for this page session only; never sent to the API or stored. */
  private readonly sessionLocation = signal<GeoPoint | null>(null);

  readonly maxStops = MAX_ITINERARY_STOPS;

  /** False until the saved plan has been loaded from the API (or there was none). */
  readonly restored = signal(false);
  /** Set when the saved plan exists but couldn't be loaded (e.g. the API is unreachable). */
  readonly loadError = signal<string | null>(null);
  readonly saving = computed(() => this.pending() > 0);

  readonly start = computed<StartPoint | null>(() => {
    const location = this.sessionLocation();
    if (location) {
      return { type: 'current', ...location };
    }
    const start = this.view()?.start;
    switch (start?.type) {
      case 'preset':
        return { type: 'preset', presetId: start.presetSlug ?? '' };
      case 'attraction':
        return { type: 'attraction', attractionId: start.attractionId ?? 0 };
      case 'custom':
        return { type: 'custom', query: start.query ?? start.label };
      default:
        return null;
    }
  });

  readonly resolvedStart = computed<ResolvedStart>(() => {
    const location = this.sessionLocation();
    if (location) {
      return { type: 'current', label: 'Your current location', point: location };
    }
    const start = this.view()?.start;
    return start && start.label
      ? toResolvedStart(start)
      : { type: 'preset', label: 'Starting point' };
  });

  /** Planned trip day (`yyyy-MM-dd`), if the tourist has chosen one. */
  readonly tripDate = computed(() => this.view()?.tripDate ?? null);
  /** ID of the read-only share link, while sharing is on. */
  readonly shareId = computed(() => this.view()?.shareId ?? null);

  readonly stops = computed(() => numberStops(this.view()?.stops.map((s) => s.attraction) ?? []));
  readonly count = computed(() => this.stops().length);
  readonly isFull = computed(() => this.count() >= MAX_ITINERARY_STOPS);
  readonly summary = computed(() => summarizeItinerary(this.stops()));
  readonly directionsUrl = computed(() =>
    buildGoogleMapsDirectionsUrl(this.resolvedStart(), this.stops()),
  );

  private readonly orderById = computed(
    () => new Map(this.stops().map((s) => [s.attraction.id, s.order] as const)),
  );

  private restoreRequested = false;

  constructor() {
    // The plan lives in this browser's guest reference, so load it only in the browser.
    afterNextRender(() => {
      if (!this.restoreRequested) {
        void this.restore();
      }
    });
  }

  isInPlan(attractionId: number): boolean {
    return this.orderById().has(attractionId);
  }

  /** 1-based stop number of an attraction in the plan, if present. */
  stopNumberOf(attractionId: number): number | undefined {
    return this.orderById().get(attractionId);
  }

  add(attraction: AttractionSummary): AddToPlanResult {
    const ids = this.currentIds();
    if (ids.includes(attraction.id)) {
      return 'duplicate';
    }
    if (ids.length >= MAX_ITINERARY_STOPS) {
      return 'full';
    }
    void this.save(
      (it) => ({ ...it, stops: [...it.stops, { order: it.stops.length + 1, attraction }] }),
      (ref) => this.api.addStop(ref, attraction.id),
      `${attraction.name} couldn’t be added to your plan.`,
    );
    return 'added';
  }

  /** Adds the example day (demo content). Resolves to how many stops were added. */
  async addSampleDay(): Promise<number> {
    const before = this.count();
    const saved = await this.save(
      null,
      (ref) => this.api.addStopsBySlug(ref, SAMPLE_DAY_SLUGS),
      'The sample day couldn’t be added.',
    );
    return saved ? this.count() - before : 0;
  }

  /** Removes a stop and returns its former index (or -1), which `insertAt` can use for undo. */
  remove(attractionId: number): number {
    const index = this.currentIds().indexOf(attractionId);
    if (index === -1) {
      return -1;
    }
    void this.save(
      (it) => ({ ...it, stops: it.stops.filter((s) => s.attraction.id !== attractionId) }),
      (ref) => this.api.removeStop(ref, attractionId),
      'That stop couldn’t be removed.',
    );
    return index;
  }

  insertAt(attraction: AttractionSummary, index: number): void {
    const ids = this.currentIds();
    if (ids.includes(attraction.id) || ids.length >= MAX_ITINERARY_STOPS) {
      return;
    }
    const position = Math.max(0, Math.min(index, ids.length));
    void this.save(
      (it) => {
        const stops = [...it.stops];
        stops.splice(position, 0, { order: position + 1, attraction });
        return { ...it, stops };
      },
      (ref) => this.api.addStop(ref, attraction.id, position),
      `${attraction.name} couldn’t be put back in your plan.`,
    );
  }

  move(fromIndex: number, toIndex: number): void {
    const ids = this.currentIds();
    const next = moveItem(ids, fromIndex, toIndex);
    if (next.some((id, i) => id !== ids[i])) {
      this.setOrder(next);
    }
  }

  /** Replaces the order. Only call after the tourist has explicitly chosen the new order. */
  setOrder(attractionIds: readonly number[]): void {
    const current = this.view()?.stops ?? [];
    const byId = new Map(current.map((s) => [s.attraction.id, s] as const));
    if (attractionIds.length !== current.length || !attractionIds.every((id) => byId.has(id))) {
      return;
    }
    const order = [...attractionIds];
    void this.save(
      (it) => ({ ...it, stops: order.map((id) => byId.get(id)!) }),
      (ref) => this.api.reorder(ref, order),
      'Your new order couldn’t be saved.',
    );
  }

  clear(): void {
    void this.save(
      (it) => ({ ...it, stops: [] }),
      (ref) => this.api.clear(ref),
      'Your plan couldn’t be cleared.',
    );
  }

  /** Resolves to false if the change couldn't be saved (the tourist has been told why). */
  async setStart(start: StartPoint): Promise<boolean> {
    if (start.type === 'current') {
      this.sessionLocation.set({ latitude: start.latitude, longitude: start.longitude });
      return true;
    }
    const request: UpdateStartRequest =
      start.type === 'preset'
        ? { type: 'preset', presetSlug: start.presetId }
        : start.type === 'attraction'
          ? { type: 'attraction', attractionId: start.attractionId }
          : { type: 'custom', query: start.query };
    const saved = await this.save(
      null,
      (ref) => this.api.updateStart(ref, request),
      'Your starting point couldn’t be changed.',
    );
    if (saved) {
      this.sessionLocation.set(null);
    }
    return saved;
  }

  /** Resolves to false if the date couldn't be saved (the tourist has been told why). */
  setTripDate(tripDate: string | null): Promise<boolean> {
    return this.save(
      (it) => ({ ...it, tripDate: tripDate ?? undefined }),
      (ref) => this.api.updateTripDate(ref, tripDate),
      'Your trip date couldn’t be saved.',
    );
  }

  /** Turns on the read-only share link; resolves to false if that failed. */
  enableSharing(): Promise<boolean> {
    return this.save(
      null,
      (ref) => this.api.enableSharing(ref),
      'A share link couldn’t be created.',
    );
  }

  disableSharing(): Promise<boolean> {
    return this.save(
      (it) => ({ ...it, shareId: undefined }),
      (ref) => this.api.disableSharing(ref),
      'Sharing couldn’t be turned off.',
    );
  }

  /** Loads (or reloads) the saved plan from the API. */
  restore(): Promise<void> {
    this.restoreRequested = true;
    return this.enqueue(async () => {
      this.storage.remove(LEGACY_STORAGE_KEY);
      if (!this.view()) {
        // Show "loading" rather than an empty plan while a retry is in progress.
        this.restored.set(false);
      }
      this.loadError.set(null);
      this.ref = parseGuestPlanRef(this.storage.read(GUEST_PLAN_STORAGE_KEY));
      if (!this.ref) {
        this.setConfirmed(null);
      } else {
        try {
          this.setConfirmed(await firstValueFrom(this.api.get(this.ref)));
        } catch (error) {
          if (isPlanGone(error)) {
            this.forgetPlan();
          } else {
            this.loadError.set(apiErrorMessage(error, 'We couldn’t load your saved plan.'));
          }
        }
      }
      this.restored.set(true);
    });
  }

  private currentIds(): number[] {
    return this.view()?.stops.map((s) => s.attraction.id) ?? [];
  }

  /**
   * Applies `change` to the visible plan straight away (if given), then sends `request` once all
   * earlier changes have been saved.
   */
  private save(
    change: Change | null,
    request: (ref: GuestPlanRef) => Observable<Itinerary>,
    failureMessage: string,
  ): Promise<boolean> {
    if (change) {
      this.view.update((it) => change(it ?? emptyItinerary()));
    }
    this.pending.update((n) => n + 1);

    return this.enqueue(async () => {
      try {
        const ref = await this.ensurePlan();
        this.confirmed.set(await firstValueFrom(request(ref)));
        this.loadError.set(null);
        return true;
      } catch (error) {
        this.reportFailure(error, failureMessage);
        return false;
      } finally {
        this.pending.update((n) => n - 1);
        if (this.pending() === 0) {
          this.view.set(this.confirmed());
        }
      }
    });
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private async ensurePlan(): Promise<GuestPlanRef> {
    if (this.ref) {
      return this.ref;
    }
    const created = await firstValueFrom(this.api.create());
    this.ref = { id: created.itinerary.id, token: created.accessToken };
    this.storage.write(GUEST_PLAN_STORAGE_KEY, { version: 2, ...this.ref });
    this.confirmed.set(created.itinerary);
    return this.ref;
  }

  private setConfirmed(itinerary: Itinerary | null): void {
    this.confirmed.set(itinerary);
    if (this.pending() === 0) {
      this.view.set(itinerary);
    }
  }

  private forgetPlan(): void {
    this.ref = null;
    this.storage.remove(GUEST_PLAN_STORAGE_KEY);
    this.confirmed.set(null);
  }

  private reportFailure(error: unknown, fallback: string): void {
    if (isPlanGone(error)) {
      this.forgetPlan();
      this.toast.show('Your saved plan could no longer be found. Please add your places again.', {
        tone: 'error',
      });
      return;
    }
    const problem = apiProblem(error);
    const message = isUnreachable(error)
      ? `${fallback} We couldn’t reach the server — please check your connection and try again.`
      : hasStatus(error, 409) || hasStatus(error, 400)
        ? (problem?.detail ?? fallback)
        : `${fallback} Please try again.`;
    this.toast.show(message, { tone: 'error' });
  }
}

function isPlanGone(error: unknown): boolean {
  const code = apiErrorCode(error);
  return code === 'itinerary-not-found' || code === 'itinerary-token-required';
}

function emptyItinerary(): Itinerary {
  return {
    id: '',
    start: { type: 'preset', label: '', coordinatesApproximate: false },
    stops: [],
    maxStops: MAX_ITINERARY_STOPS,
    updatedAtUtc: '',
  };
}

/** Validates the stored guest reference; returns null for anything missing or malformed. */
export function parseGuestPlanRef(raw: unknown): GuestPlanRef | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const value = raw as Record<string, unknown>;
  const { id, token } = value;
  return value['version'] === 2 &&
    typeof id === 'string' &&
    GUID_PATTERN.test(id) &&
    typeof token === 'string' &&
    TOKEN_PATTERN.test(token)
    ? { id, token }
    : null;
}
