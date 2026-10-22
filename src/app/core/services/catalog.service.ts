import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { apiUrl } from '../api/api';
import { CategoryInfo, categoryIcon } from '../models/attraction.model';
import { StartPreset } from '../models/trip-plan.model';

interface CategoryDto {
  slug: string;
  name: string;
  description?: string;
}

interface StartPointDto {
  slug: string;
  label: string;
  description: string;
  latitude: number;
  longitude: number;
  coordinatesApproximate: boolean;
  isDefault: boolean;
}

/** Small reference lists that rarely change; each is requested once per app instance. */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);

  private readonly categories$ = this.http.get<CategoryDto[]>(apiUrl('/categories')).pipe(
    map((list) =>
      list.map<CategoryInfo>((c) => ({
        id: c.slug,
        label: c.name,
        description: c.description,
        icon: categoryIcon(c.slug),
      })),
    ),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  private readonly startPoints$ = this.http.get<StartPointDto[]>(apiUrl('/start-points')).pipe(
    map((list) => list.map<StartPreset>(({ slug, ...rest }) => ({ id: slug, ...rest }))),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  getCategories(): Observable<CategoryInfo[]> {
    return this.categories$;
  }

  getStartPoints(): Observable<StartPreset[]> {
    return this.startPoints$;
  }
}
