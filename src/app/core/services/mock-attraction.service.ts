import { Injectable, afterNextRender, inject, signal } from '@angular/core';
import { BehaviorSubject, Observable, map, of, throwError } from 'rxjs';
import { MOCK_ATTRACTIONS } from '../data/attractions.mock';
import {
  ATTRACTION_CATEGORIES,
  Attraction,
  AttractionDraft,
  AttractionSearchCriteria,
} from '../models/attraction.model';
import { filterAttractions } from '../utils/attraction-filter';
import { isValidLatitude, isValidLongitude, straightLineDistanceKm } from '../utils/geo';
import { AttractionService, NearbyAttraction } from './attraction.service';
import { BrowserStorageService } from './browser-storage.service';

const DEMO_STORAGE_KEY = 'kdtp.demo-attractions.v1';

/**
 * In-memory attraction data source for the prototype. Admin demo edits are kept in
 * localStorage of this browser only; nothing is sent to a server.
 */
@Injectable({ providedIn: 'root' })
export class MockAttractionService implements AttractionService {
  private readonly storage = inject(BrowserStorageService);
  private readonly store$ = new BehaviorSubject<Attraction[]>(cloneSeed());

  /** True when the admin demo has changed the seed data in this browser. */
  readonly hasDemoChanges = signal(false);

  constructor() {
    // Restore after the first render so hydrated markup matches the server-rendered seed data.
    afterNextRender(() => this.restoreDemoChanges());
  }

  getAttractions(): Observable<Attraction[]> {
    return this.store$.asObservable();
  }

  getAttractionById(id: string): Observable<Attraction | undefined> {
    return this.store$.pipe(map((list) => list.find((a) => a.id === id)));
  }

  getAttractionBySlug(slug: string): Observable<Attraction | undefined> {
    return this.store$.pipe(map((list) => list.find((a) => a.slug === slug)));
  }

  searchAttractions(criteria: AttractionSearchCriteria): Observable<Attraction[]> {
    return this.store$.pipe(map((list) => filterAttractions(list, criteria)));
  }

  getNearbyAttractions(id: string, limit: number): Observable<NearbyAttraction[]> {
    return this.store$.pipe(
      map((list) => {
        const origin = list.find((a) => a.id === id);
        if (!origin) {
          return [];
        }
        return list
          .filter((a) => a.id !== id)
          .map((attraction) => ({
            attraction,
            distanceKm: straightLineDistanceKm(origin, attraction),
          }))
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, limit);
      }),
    );
  }

  isSlugAvailable(slug: string, exceptId?: string): Observable<boolean> {
    return of(!this.store$.value.some((a) => a.slug === slug && a.id !== exceptId));
  }

  createAttraction(draft: AttractionDraft): Observable<Attraction> {
    if (this.store$.value.some((a) => a.slug === draft.slug)) {
      return throwError(() => new Error('An attraction with this URL slug already exists.'));
    }
    const created: Attraction = { ...draft, id: `att-${Date.now().toString(36)}` };
    this.commit([...this.store$.value, created]);
    return of(created);
  }

  updateAttraction(id: string, draft: AttractionDraft): Observable<Attraction> {
    const list = this.store$.value;
    if (!list.some((a) => a.id === id)) {
      return throwError(() => new Error('This attraction no longer exists.'));
    }
    if (list.some((a) => a.slug === draft.slug && a.id !== id)) {
      return throwError(() => new Error('An attraction with this URL slug already exists.'));
    }
    const updated: Attraction = { ...draft, id };
    this.commit(list.map((a) => (a.id === id ? updated : a)));
    return of(updated);
  }

  deleteAttraction(id: string): Observable<void> {
    this.commit(this.store$.value.filter((a) => a.id !== id));
    return of(undefined);
  }

  /** Demo-only: discard admin edits and return to the bundled seed data. */
  resetDemoData(): void {
    this.storage.remove(DEMO_STORAGE_KEY);
    this.hasDemoChanges.set(false);
    this.store$.next(cloneSeed());
  }

  restoreDemoChanges(): void {
    const stored = this.storage.read(DEMO_STORAGE_KEY);
    if (stored === null) {
      return;
    }
    const valid = Array.isArray(stored) ? stored.filter(isAttractionRecord) : [];
    if (valid.length === 0) {
      this.storage.remove(DEMO_STORAGE_KEY);
      return;
    }
    this.hasDemoChanges.set(true);
    this.store$.next(valid);
  }

  private commit(list: Attraction[]): void {
    this.store$.next(list);
    this.hasDemoChanges.set(true);
    this.storage.write(DEMO_STORAGE_KEY, list);
  }
}

function cloneSeed(): Attraction[] {
  return structuredClone(MOCK_ATTRACTIONS);
}

const CATEGORY_IDS = new Set<string>(ATTRACTION_CATEGORIES.map((c) => c.id));

function isAttractionRecord(value: unknown): value is Attraction {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const a = value as Record<string, unknown>;
  return (
    typeof a['id'] === 'string' &&
    typeof a['name'] === 'string' &&
    typeof a['slug'] === 'string' &&
    typeof a['category'] === 'string' &&
    CATEGORY_IDS.has(a['category']) &&
    typeof a['shortDescription'] === 'string' &&
    Array.isArray(a['description']) &&
    typeof a['imageUrl'] === 'string' &&
    Array.isArray(a['gallery']) &&
    Array.isArray(a['tags']) &&
    Array.isArray(a['visitorTips']) &&
    isValidLatitude(a['latitude']) &&
    isValidLongitude(a['longitude'])
  );
}
