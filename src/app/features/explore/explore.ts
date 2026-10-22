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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  Subject,
  catchError,
  concatMap,
  debounceTime,
  map,
  merge,
  of,
  scan,
  skip,
  startWith,
  switchMap,
  take,
} from 'rxjs';
import { PagedResult, apiErrorMessage } from '../../core/api/api';
import {
  AttractionCategory,
  AttractionSearchCriteria,
  AttractionSort,
  AttractionSummary,
  CategoryInfo,
  DURATION_FILTERS,
  DurationFilter,
} from '../../core/models/attraction.model';
import { AttractionService } from '../../core/services/attraction.service';
import { CatalogService } from '../../core/services/catalog.service';
import { TripPlanService } from '../../core/services/trip-plan.service';
import { LoadState, withLoadState } from '../../core/utils/load-state';
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

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 250;
const CATEGORY_SLUG = /^[a-z0-9-]{1,50}$/;

interface Filters {
  query: string;
  category: AttractionCategory | 'all';
  duration: DurationFilter;
  sort: AttractionSort;
}

interface Results {
  items: AttractionSummary[];
  totalCount: number;
  page: number;
  hasNextPage: boolean;
  loadingMore: boolean;
  loadMoreError: string;
}

type PageEvent =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'page'; result: PagedResult<AttractionSummary> };

function applyPageEvent(current: LoadState<Results>, event: PageEvent): LoadState<Results> {
  if (current.status !== 'ready') {
    return current;
  }
  const data = current.data;
  switch (event.kind) {
    case 'loading':
      return { status: 'ready', data: { ...data, loadingMore: true, loadMoreError: '' } };
    case 'error':
      return {
        status: 'ready',
        data: { ...data, loadingMore: false, loadMoreError: event.message },
      };
    case 'page': {
      const known = new Set(data.items.map((a) => a.id));
      return {
        status: 'ready',
        data: {
          items: [...data.items, ...event.result.items.filter((a) => !known.has(a.id))],
          totalCount: event.result.totalCount,
          page: event.result.page,
          hasNextPage: event.result.hasNextPage,
          loadingMore: false,
          loadMoreError: '',
        },
      };
    }
  }
}

function filtersFromParams(params: ParamMap): Filters {
  const category = params.get('category') ?? '';
  const duration = params.get('duration') ?? '';
  const sort = params.get('sort') ?? '';
  return {
    query: (params.get('q') ?? '').slice(0, 100),
    category: CATEGORY_SLUG.test(category) ? category : 'all',
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

  protected readonly categories = toSignal(
    inject(CatalogService)
      .getCategories()
      .pipe(catchError(() => of<CategoryInfo[]>([]))),
    { initialValue: [] as CategoryInfo[] },
  );
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
  private readonly retry$ = new Subject<void>();
  private readonly loadMore$ = new Subject<number>();

  /**
   * The first search runs immediately (so server rendering includes results); later changes are
   * debounced so typing doesn't send a request per keystroke.
   */
  protected readonly results = toSignal(
    merge(
      this.criteria$.pipe(take(1)),
      this.criteria$.pipe(skip(1), debounceTime(SEARCH_DEBOUNCE_MS)),
      this.retry$.pipe(map(() => this.criteria$.value)),
    ).pipe(switchMap((criteria) => this.pages(criteria))),
    { requireSync: true },
  );

  protected readonly totalCount = toSignal(
    this.attractionService.count().pipe(catchError(() => of(null))),
    { initialValue: null },
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
    if (results.status !== 'ready') {
      return '';
    }
    const shown = results.data.totalCount;
    const total = this.totalCount() ?? shown;
    const noun = total === 1 ? 'attraction' : 'attractions';
    return shown >= total ? `Showing all ${total} ${noun}` : `Showing ${shown} of ${total} ${noun}`;
  });

  private writingUrl = false;

  constructor() {
    // Keep filters in the URL so results can be shared and survive a refresh.
    effect(() => {
      const criteria = this.criteria();
      untracked(() => {
        if (JSON.stringify(criteria) !== JSON.stringify(this.criteria$.value)) {
          this.criteria$.next(criteria);
        }
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
    this.retry$.next();
  }

  protected showMore(): void {
    const results = this.results();
    if (results.status === 'ready' && results.data.hasNextPage && !results.data.loadingMore) {
      this.loadMore$.next(results.data.page + 1);
    }
  }

  /** Loads page 1 for the criteria, then appends further pages on "Show more". */
  private pages(criteria: AttractionSearchCriteria): Observable<LoadState<Results>> {
    const firstPage = withLoadState(
      this.attractionService.search({ ...criteria, pageSize: PAGE_SIZE }),
      'We couldn’t load attractions right now.',
    ).pipe(
      map((state): LoadState<Results> =>
        state.status === 'ready'
          ? {
              status: 'ready',
              data: {
                items: state.data.items,
                totalCount: state.data.totalCount,
                page: state.data.page,
                hasNextPage: state.data.hasNextPage,
                loadingMore: false,
                loadMoreError: '',
              },
            }
          : state,
      ),
    );

    const morePages = this.loadMore$.pipe(
      concatMap((page) =>
        this.attractionService.search({ ...criteria, page, pageSize: PAGE_SIZE }).pipe(
          map((result): PageEvent => ({ kind: 'page', result })),
          catchError((error: unknown) =>
            of<PageEvent>({
              kind: 'error',
              message: apiErrorMessage(error, 'More attractions couldn’t be loaded.'),
            }),
          ),
          startWith<PageEvent>({ kind: 'loading' }),
        ),
      ),
    );

    return firstPage.pipe(
      switchMap((state) =>
        state.status === 'ready'
          ? morePages.pipe(scan(applyPageEvent, state), startWith(state))
          : of(state),
      ),
    );
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
