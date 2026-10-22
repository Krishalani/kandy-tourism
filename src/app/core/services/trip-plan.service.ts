import { Injectable, afterNextRender, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  DEFAULT_START_PRESET_ID,
  MOCK_SAMPLE_ITINERARY_IDS,
  MOCK_START_PRESETS,
} from '../data/start-presets.mock';
import { Attraction } from '../models/attraction.model';
import { AddToPlanResult, StartPoint, StartPreset, TripPlanState } from '../models/trip-plan.model';
import { isValidLatitude, isValidLongitude } from '../utils/geo';
import {
  MAX_ITINERARY_STOPS,
  buildGoogleMapsDirectionsUrl,
  moveItem,
  resolveItinerary,
  resolveStart,
  summarizeItinerary,
} from '../utils/route-planner';
import { AttractionService } from './attraction.service';
import { BrowserStorageService } from './browser-storage.service';

export const TRIP_PLAN_STORAGE_KEY = 'kdtp.trip-plan.v1';

const DEFAULT_START: StartPoint = { type: 'preset', presetId: DEFAULT_START_PRESET_ID };

/**
 * Single source of truth for the tourist's itinerary. The header, Explore, Attraction
 * Details and My Plan all read from here, so the list, map preview and Google Maps link
 * always use the same order. The order is only changed by explicit tourist actions.
 */
@Injectable({ providedIn: 'root' })
export class TripPlanService {
  private readonly storage = inject(BrowserStorageService);
  private readonly attractions = toSignal(inject(AttractionService).getAttractions(), {
    initialValue: [] as Attraction[],
  });

  private readonly state = signal<TripPlanState>({
    version: 1,
    stopIds: [],
    start: DEFAULT_START,
  });

  readonly maxStops = MAX_ITINERARY_STOPS;
  readonly startPresets: readonly StartPreset[] = MOCK_START_PRESETS;

  /** False until the saved plan has been read from this browser's storage. */
  readonly restored = signal(false);

  private readonly attractionsById = computed(
    () => new Map(this.attractions().map((a) => [a.id, a] as const)),
  );

  readonly start = computed(() => this.state().start);
  readonly stops = computed(() => resolveItinerary(this.state().stopIds, this.attractionsById()));
  readonly resolvedStart = computed(() =>
    resolveStart(this.state().start, this.startPresets, this.attractionsById()),
  );
  readonly count = computed(() => this.stops().length);
  readonly isFull = computed(() => this.count() >= MAX_ITINERARY_STOPS);
  readonly summary = computed(() => summarizeItinerary(this.stops()));
  readonly directionsUrl = computed(() =>
    buildGoogleMapsDirectionsUrl(this.resolvedStart(), this.stops()),
  );

  private readonly orderById = computed(
    () => new Map(this.stops().map((s) => [s.attraction.id, s.order] as const)),
  );

  constructor() {
    // Restore after the first render so hydrated markup matches the server-rendered page.
    afterNextRender(() => this.restore());
  }

  isInPlan(attractionId: string): boolean {
    return this.orderById().has(attractionId);
  }

  /** 1-based stop number of an attraction in the plan, if present. */
  stopNumberOf(attractionId: string): number | undefined {
    return this.orderById().get(attractionId);
  }

  add(attractionId: string): AddToPlanResult {
    const ids = this.currentIds();
    if (ids.includes(attractionId)) {
      return 'duplicate';
    }
    if (ids.length >= MAX_ITINERARY_STOPS) {
      return 'full';
    }
    this.commitIds([...ids, attractionId]);
    return 'added';
  }

  /** Adds several attractions in the given order, skipping duplicates. Returns how many were added. */
  addMany(attractionIds: readonly string[]): number {
    let added = 0;
    for (const id of attractionIds) {
      if (this.add(id) === 'added') {
        added++;
      }
    }
    return added;
  }

  /** Removes a stop and returns its former index (or -1), which `insertAt` can use for undo. */
  remove(attractionId: string): number {
    if (!this.state().stopIds.includes(attractionId)) {
      return -1;
    }
    // The attraction may already be gone from the data source (e.g. deleted by the admin
    // demo), in which case it is not in currentIds() but must still be pruned from storage.
    const ids = this.currentIds();
    this.commitIds(ids.filter((id) => id !== attractionId));
    return ids.indexOf(attractionId);
  }

  insertAt(attractionId: string, index: number): void {
    const ids = this.currentIds().filter((id) => id !== attractionId);
    if (ids.length >= MAX_ITINERARY_STOPS) {
      return;
    }
    ids.splice(Math.max(0, Math.min(index, ids.length)), 0, attractionId);
    this.commitIds(ids);
  }

  move(fromIndex: number, toIndex: number): void {
    const ids = this.currentIds();
    const next = moveItem(ids, fromIndex, toIndex);
    if (next.some((id, i) => id !== ids[i])) {
      this.commitIds(next);
    }
  }

  /** Replaces the order. Only call after the tourist has explicitly accepted the new order. */
  setOrder(attractionIds: readonly string[]): void {
    const current = new Set(this.currentIds());
    const next = attractionIds.filter((id) => current.has(id));
    if (next.length === current.size) {
      this.commitIds(next);
    }
  }

  clear(): void {
    this.commitIds([]);
  }

  /** Adds the example day (demo content) to the plan. Returns how many stops were added. */
  addSampleDay(): number {
    return this.addMany(MOCK_SAMPLE_ITINERARY_IDS);
  }

  setStart(start: StartPoint): void {
    this.commit({ ...this.state(), start });
  }

  restore(): void {
    const parsed = parseTripPlan(this.storage.read(TRIP_PLAN_STORAGE_KEY));
    if (parsed) {
      this.state.set(parsed);
    } else {
      this.storage.remove(TRIP_PLAN_STORAGE_KEY);
    }
    this.restored.set(true);
  }

  /** IDs in display order, ignoring any that no longer match an attraction. */
  private currentIds(): string[] {
    if (this.attractions().length === 0) {
      return [...this.state().stopIds];
    }
    return this.stops().map((s) => s.attraction.id);
  }

  private commitIds(stopIds: string[]): void {
    this.commit({ ...this.state(), stopIds });
  }

  private commit(next: TripPlanState): void {
    this.state.set(next);
    // The device location is used for this session only and is never persisted.
    const persisted: TripPlanState =
      next.start.type === 'current' ? { ...next, start: DEFAULT_START } : next;
    this.storage.write(TRIP_PLAN_STORAGE_KEY, persisted);
  }
}

/** Validates stored data; returns null for anything missing, outdated or malformed. */
export function parseTripPlan(raw: unknown): TripPlanState | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const value = raw as Record<string, unknown>;
  if (value['version'] !== 1 || !Array.isArray(value['stopIds'])) {
    return null;
  }
  const stopIds = [
    ...new Set(value['stopIds'].filter((id): id is string => typeof id === 'string' && !!id)),
  ].slice(0, MAX_ITINERARY_STOPS);

  return { version: 1, stopIds, start: parseStart(value['start']) };
}

function parseStart(raw: unknown): StartPoint {
  if (typeof raw !== 'object' || raw === null) {
    return DEFAULT_START;
  }
  const value = raw as Record<string, unknown>;
  switch (value['type']) {
    case 'preset':
      return MOCK_START_PRESETS.some((p) => p.id === value['presetId'])
        ? { type: 'preset', presetId: value['presetId'] as string }
        : DEFAULT_START;
    case 'attraction':
      return typeof value['attractionId'] === 'string'
        ? { type: 'attraction', attractionId: value['attractionId'] }
        : DEFAULT_START;
    case 'custom': {
      const query = typeof value['query'] === 'string' ? value['query'].trim().slice(0, 200) : '';
      return query ? { type: 'custom', query } : DEFAULT_START;
    }
    case 'current':
      return isValidLatitude(value['latitude']) && isValidLongitude(value['longitude'])
        ? { type: 'current', latitude: value['latitude'], longitude: value['longitude'] }
        : DEFAULT_START;
    default:
      return DEFAULT_START;
  }
}
