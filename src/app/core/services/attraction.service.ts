import { Observable } from 'rxjs';
import { Attraction, AttractionDraft, AttractionSearchCriteria } from '../models/attraction.model';

export interface NearbyAttraction {
  attraction: Attraction;
  /** Straight-line distance; not a travel distance. */
  distanceKm: number;
}

/**
 * Data-source contract for attractions. Components depend only on this class.
 * The prototype binds it to `MockAttractionService` in `app.config.ts`; a future
 * `HttpAttractionService` calling the ASP.NET Core Web API can replace it there.
 */
export abstract class AttractionService {
  abstract getAttractions(): Observable<Attraction[]>;
  abstract getAttractionById(id: string): Observable<Attraction | undefined>;
  abstract getAttractionBySlug(slug: string): Observable<Attraction | undefined>;
  abstract searchAttractions(criteria: AttractionSearchCriteria): Observable<Attraction[]>;
  abstract getNearbyAttractions(id: string, limit: number): Observable<NearbyAttraction[]>;
  abstract isSlugAvailable(slug: string, exceptId?: string): Observable<boolean>;
  abstract createAttraction(draft: AttractionDraft): Observable<Attraction>;
  abstract updateAttraction(id: string, draft: AttractionDraft): Observable<Attraction>;
  abstract deleteAttraction(id: string): Observable<void>;
}
