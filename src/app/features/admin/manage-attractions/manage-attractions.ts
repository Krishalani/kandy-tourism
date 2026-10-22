import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, debounceTime, of, switchMap } from 'rxjs';
import { PagedResult, apiErrorMessage } from '../../../core/api/api';
import {
  AttractionCategory,
  AttractionSummary,
  CategoryInfo,
} from '../../../core/models/attraction.model';
import { AttractionService } from '../../../core/services/attraction.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { TripPlanService } from '../../../core/services/trip-plan.service';
import { LoadState, withLoadState } from '../../../core/utils/load-state';
import { Icon } from '../../../shared/components/icon/icon';
import { EmptyState } from '../../../shared/components/state/empty-state';
import { ErrorState } from '../../../shared/components/state/error-state';
import { ImgFallbackDirective } from '../../../shared/directives/img-fallback.directive';
import { DurationPipe } from '../../../shared/pipes/duration.pipe';

/** The API's maximum page size; enough for this catalogue on one page. */
const ADMIN_PAGE_SIZE = 100;

@Component({
  selector: 'app-manage-attractions',
  imports: [RouterLink, Icon, EmptyState, ErrorState, ImgFallbackDirective, DurationPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './manage-attractions.scss',
  templateUrl: './manage-attractions.html',
})
export default class ManageAttractions {
  private readonly attractionService = inject(AttractionService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly plan = inject(TripPlanService);

  protected readonly categories = toSignal(
    inject(CatalogService)
      .getCategories()
      .pipe(catchError(() => of<CategoryInfo[]>([]))),
    { initialValue: [] as CategoryInfo[] },
  );
  protected readonly query = signal('');
  protected readonly category = signal<AttractionCategory | 'all'>('all');

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  protected readonly state = toSignal(
    combineLatest([
      toObservable(computed(() => ({ query: this.query(), category: this.category() }))).pipe(
        debounceTime(200),
      ),
      this.refresh$,
    ]).pipe(
      switchMap(([filters]) =>
        withLoadState(
          this.attractionService.search({ ...filters, sort: 'name', pageSize: ADMIN_PAGE_SIZE }),
          'Attractions couldn’t be loaded.',
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as LoadState<PagedResult<AttractionSummary>> },
  );

  protected readonly rows = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.data.items : [];
  });

  protected readonly truncated = computed(() => {
    const state = this.state();
    return state.status === 'ready' && state.data.totalCount > state.data.items.length;
  });

  protected async delete(attraction: AttractionSummary): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: `Delete “${attraction.name}”?`,
      message:
        'It will no longer be listed on the website. Guest plans that include it will stop showing it. Saved plans themselves are not deleted.',
      confirmLabel: 'Delete attraction',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }
    this.attractionService.deleteAttraction(attraction.id).subscribe({
      next: () => {
        this.toast.show(`${attraction.name} was deleted.`, { tone: 'info' });
        this.refresh$.next();
        void this.plan.restore();
      },
      error: (error: unknown) =>
        this.toast.show(apiErrorMessage(error, `${attraction.name} couldn’t be deleted.`), {
          tone: 'error',
        }),
    });
  }
}
