import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { CategoryInfo } from '../../core/models/attraction.model';
import { AttractionService } from '../../core/services/attraction.service';
import { CatalogService } from '../../core/services/catalog.service';
import { SiteInfoService } from '../../core/services/site-info.service';
import { TripPlanService } from '../../core/services/trip-plan.service';
import { toLoadState } from '../../core/utils/load-state';
import { AttractionCard } from '../../shared/components/attraction-card/attraction-card';
import { HowItWorks } from '../../shared/components/how-it-works/how-it-works';
import { Icon } from '../../shared/components/icon/icon';
import { EmptyState } from '../../shared/components/state/empty-state';
import { ErrorState } from '../../shared/components/state/error-state';
import { LoadingState } from '../../shared/components/state/loading-state';
import { ImgFallbackDirective } from '../../shared/directives/img-fallback.directive';

const FEATURED_COUNT = 6;

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    Icon,
    AttractionCard,
    HowItWorks,
    LoadingState,
    ErrorState,
    EmptyState,
    ImgFallbackDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export default class Home {
  private readonly attractionService = inject(AttractionService);
  protected readonly site = inject(SiteInfoService);
  protected readonly plan = inject(TripPlanService);

  protected readonly categories = toSignal(
    inject(CatalogService)
      .getCategories()
      .pipe(catchError(() => of<CategoryInfo[]>([]))),
    { initialValue: [] as CategoryInfo[] },
  );

  protected readonly featured = toLoadState(
    this.attractionService
      .search({ featured: true, pageSize: FEATURED_COUNT })
      .pipe(map((result) => result.items)),
    'Featured attractions are unavailable right now.',
  );

  protected readonly attractionCount = toSignal(
    this.attractionService.count().pipe(catchError(() => of(null))),
    { initialValue: null },
  );
}
