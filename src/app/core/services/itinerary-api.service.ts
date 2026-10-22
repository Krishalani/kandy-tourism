import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../api/api';
import {
  CreatedItinerary,
  GuestPlanRef,
  Itinerary,
  ItineraryStartDto,
} from '../models/trip-plan.model';

const TOKEN_HEADER = 'X-Itinerary-Token';

export type UpdateStartRequest = Pick<
  ItineraryStartDto,
  'type' | 'presetSlug' | 'attractionId' | 'query'
>;

/** Guest itinerary endpoints. The plan's secret token travels in a header, never in the URL. */
@Injectable({ providedIn: 'root' })
export class ItineraryApiService {
  private readonly http = inject(HttpClient);

  create(): Observable<CreatedItinerary> {
    return this.http.post<CreatedItinerary>(apiUrl('/itineraries'), {});
  }

  get(ref: GuestPlanRef): Observable<Itinerary> {
    return this.http.get<Itinerary>(this.url(ref), this.options(ref));
  }

  updateStart(ref: GuestPlanRef, start: UpdateStartRequest): Observable<Itinerary> {
    return this.http.put<Itinerary>(this.url(ref, '/start'), start, this.options(ref));
  }

  addStop(ref: GuestPlanRef, attractionId: number, position?: number): Observable<Itinerary> {
    return this.http.post<Itinerary>(
      this.url(ref, '/stops'),
      { attractionId, position },
      this.options(ref),
    );
  }

  addStopsBySlug(ref: GuestPlanRef, attractionSlugs: readonly string[]): Observable<Itinerary> {
    return this.http.post<Itinerary>(
      this.url(ref, '/stops/bulk'),
      { attractionSlugs },
      this.options(ref),
    );
  }

  removeStop(ref: GuestPlanRef, attractionId: number): Observable<Itinerary> {
    return this.http.delete<Itinerary>(this.url(ref, `/stops/${attractionId}`), this.options(ref));
  }

  reorder(ref: GuestPlanRef, attractionIds: readonly number[]): Observable<Itinerary> {
    return this.http.put<Itinerary>(
      this.url(ref, '/stops/order'),
      { attractionIds },
      this.options(ref),
    );
  }

  clear(ref: GuestPlanRef): Observable<Itinerary> {
    return this.http.delete<Itinerary>(this.url(ref, '/stops'), this.options(ref));
  }

  private url(ref: GuestPlanRef, suffix = ''): string {
    return apiUrl(`/itineraries/${encodeURIComponent(ref.id)}${suffix}`);
  }

  private options(ref: GuestPlanRef) {
    return { headers: new HttpHeaders({ [TOKEN_HEADER]: ref.token }) };
  }
}
