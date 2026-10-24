import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { PagedResult, apiUrl, hasStatus } from '../api/api';
import {
  Attraction,
  AttractionDraft,
  AttractionSearchCriteria,
  AttractionSummary,
  NearbyAttraction,
} from '../models/attraction.model';

export const DEFAULT_PAGE_SIZE = 24;

/** Attraction data from the Web API. Public reads are anonymous; admin calls get a token from the interceptor. */
@Injectable({ providedIn: 'root' })
export class AttractionService {
  private readonly http = inject(HttpClient);

  search(criteria: AttractionSearchCriteria = {}): Observable<PagedResult<AttractionSummary>> {
    let params = new HttpParams().set('pageSize', criteria.pageSize ?? DEFAULT_PAGE_SIZE);
    const query = criteria.query?.trim();
    if (query) {
      params = params.set('q', query);
    }
    if (criteria.categories?.length) {
      params = params.set('category', criteria.categories.join(','));
    } else if (criteria.category && criteria.category !== 'all') {
      params = params.set('category', criteria.category);
    }
    if (criteria.duration && criteria.duration !== 'any') {
      params = params.set('duration', criteria.duration);
    }
    if (criteria.sort && criteria.sort !== 'recommended') {
      params = params.set('sort', criteria.sort);
    }
    if (criteria.featured !== undefined) {
      params = params.set('featured', criteria.featured);
    }
    if (criteria.page && criteria.page > 1) {
      params = params.set('page', criteria.page);
    }
    return this.http.get<PagedResult<AttractionSummary>>(apiUrl('/attractions'), { params });
  }

  /** Number of attractions currently listed. */
  count(): Observable<number> {
    return this.search({ pageSize: 1 }).pipe(map((result) => result.totalCount));
  }

  /** Resolves to `null` when no attraction uses the slug. */
  getBySlug(slug: string): Observable<Attraction | null> {
    return this.http
      .get<Attraction>(apiUrl(`/attractions/by-slug/${encodeURIComponent(slug)}`))
      .pipe(nullOn404());
  }

  getNearby(id: number, limit: number): Observable<NearbyAttraction[]> {
    return this.http.get<NearbyAttraction[]>(apiUrl(`/attractions/${id}/nearby`), {
      params: { limit },
    });
  }

  /** Admin: full record for the edit form. Resolves to `null` if it no longer exists. */
  getForEdit(id: number): Observable<Attraction | null> {
    return this.http.get<Attraction>(apiUrl(`/admin/attractions/${id}`)).pipe(nullOn404());
  }

  createAttraction(draft: AttractionDraft): Observable<Attraction> {
    return this.http.post<Attraction>(apiUrl('/admin/attractions'), draft);
  }

  updateAttraction(id: number, draft: AttractionDraft): Observable<Attraction> {
    return this.http.put<Attraction>(apiUrl(`/admin/attractions/${id}`), draft);
  }

  deleteAttraction(id: number): Observable<void> {
    return this.http.delete<void>(apiUrl(`/admin/attractions/${id}`));
  }
}

function nullOn404<T>() {
  return (source: Observable<T>) =>
    source.pipe(
      catchError((error) => (hasStatus(error, 404) ? of(null) : throwError(() => error))),
    );
}
