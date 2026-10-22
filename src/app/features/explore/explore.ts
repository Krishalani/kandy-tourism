import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { BehaviorSubject, map, switchMap } from 'rxjs';
import {
  ATTRACTION_CATEGORIES,
  AttractionCategory,
  AttractionSearchCriteria,
  AttractionSort,
  DurationFilter,
} from '../../core/models/attraction.model';
import { AttractionService } from '../../core/services/attraction.service';
import { TripPlanService } from '../../core/services/trip-plan.service';
import { DURATION_FILTERS } from '../../core/utils/attraction-filter';
import { toLoadState } from '../../core/utils/load-state';
import { AttractionCard } from '../../shared/components/attraction-card/attraction-card';
import { Icon } from '../../shared/components/icon/icon';
import { EmptyState } from '../../shared/components/state/empty-state';
import { ErrorState } from '../../shared/components/state/error-state';
import { LoadingState } from '../../shared/components/state/loading-state';

const SORT_OPTIONS: { id: AttractionSort; label: string }[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'name', label: 'Name (A–Z)' },
  { id: 'duration-asc', label: 'Shortest visit first' },
  { id: 'duration-desc', label: 'Longest visit first' },
];

const CATEGORY_IDS = new Set<string>(ATTRACTION_CATEGORIES.map((c) => c.id));

interface Filters {
  query: string;
  category: AttractionCategory | 'all';
  duration: DurationFilter;
  sort: AttractionSort;
}

function filtersFromParams(params: ParamMap): Filters {
  const category = params.get('category') ?? '';
  const duration = params.get('duration') ?? '';
  const sort = params.get('sort') ?? '';
  return {
    query: (params.get('q') ?? '').slice(0, 100),
    category: CATEGORY_IDS.has(category) ? (category as AttractionCategory) : 'all',
    duration: DURATION_FILTERS.some((d) => d.id === duration)
      ? (duration as DurationFilter)
      : 'any',
    sort: SORT_OPTIONS.some((s) => s.id === sort) ? (sort as AttractionSort) : 'recommended',
  };
}

@Component({
  selector: 'app-explore',
  imports: [RouterLink, Icon, AttractionCard, EmptyState, ErrorState, LoadingState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './explore.scss',
  templateUrl: './explore.html',
})
export default class Explore {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly attractionService = inject(AttractionService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly plan = inject(TripPlanService);

  protected readonly categories = ATTRACTION_CATEGORIES;
  protected readonly durations = DURATION_FILTERS;
  protected readonly sorts = SORT_OPTIONS;

  private readonly initial = filtersFromParams(this.route.snapshot.queryParamMap);
  protected readonly query = signal(this.initial.query);
  protected readonly category = signal(this.initial.category);
  protected readonly duration = signal(this.initial.duration);
  protected readonly sort = signal(this.initial.sort);

  private readonly criteria = computed<AttractionSearchCriteria>(() => ({
    query: this.query().trim(),
    category: this.category(),
    duration: this.duration(),
    sort: this.sort(),
  }));

  private readonly criteria$ = new BehaviorSubject<AttractionSearchCriteria>(this.criteria());
  protected readonly results = toLoadState(
    this.criteria$.pipe(switchMap((c) => this.attractionService.searchAttractions(c))),
    'We couldn’t load attractions right now.',
  );
  protected readonly totalCount = toLoadState(
    this.attractionService.getAttractions().pipe(map((list) => list.length)),
  );

  protected readonly hasActiveFilters = computed(
    () =>
      this.query().trim() !== '' ||
      this.category() !== 'all' ||
      this.duration() !== 'any' ||
      this.sort() !== 'recommended',
  );

  protected readonly resultSummary = computed(() => {
    const results = this.results();
    const total = this.totalCount();
    if (results.status !== 'ready' || total.status !== 'ready') {
      return '';
    }
    const shown = results.data.length;
    const noun = total.data === 1 ? 'attraction' : 'attractions';
    return shown === total.data
      ? `Showing all ${total.data} ${noun}`
      : `Showing ${shown} of ${total.data} ${noun}`;
  });

  private writingUrl = false;

  constructor() {
    // Keep filters in the URL so results can be shared and survive a refresh.
    effect(() => {
      const criteria = this.criteria();
      untracked(() => {
        this.criteria$.next(criteria);
        this.syncUrl();
      });
    });

    // React to external URL changes (e.g. back button or a category link) while on the page.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (this.writingUrl) {
        return;
      }
      const next = filtersFromParams(params);
      this.query.set(next.query);
      this.category.set(next.category);
      this.duration.set(next.duration);
      this.sort.set(next.sort);
    });
  }

  protected setCategory(category: AttractionCategory | 'all'): void {
    this.category.set(category);
  }

  protected clearFilters(): void {
    this.query.set('');
    this.category.set('all');
    this.duration.set('any');
    this.sort.set('recommended');
  }

  protected retry(): void {
    this.criteria$.next(this.criteria());
  }

  private syncUrl(): void {
    if (!this.isBrowser) {
      return;
    }
    const queryParams = {
      q: this.query().trim() || null,
      category: this.category() === 'all' ? null : this.category(),
      duration: this.duration() === 'any' ? null : this.duration(),
      sort: this.sort() === 'recommended' ? null : this.sort(),
    };
    const current = filtersFromParams(this.route.snapshot.queryParamMap);
    const unchanged =
      current.query === (queryParams.q ?? '') &&
      current.category === this.category() &&
      current.duration === this.duration() &&
      current.sort === this.sort();
    if (unchanged) {
      return;
    }
    this.writingUrl = true;
    this.router
      .navigate([], { relativeTo: this.route, queryParams, replaceUrl: true })
      .finally(() => (this.writingUrl = false));
  }
}
