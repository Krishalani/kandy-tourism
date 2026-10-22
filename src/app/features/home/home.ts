import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ATTRACTION_CATEGORIES } from '../../core/models/attraction.model';
import { AttractionService } from '../../core/services/attraction.service';
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
  protected readonly site = inject(SiteInfoService);
  protected readonly plan = inject(TripPlanService);
  protected readonly categories = ATTRACTION_CATEGORIES;

  private readonly attractions = toLoadState(inject(AttractionService).getAttractions());

  protected readonly featured = computed(() => {
    const state = this.attractions();
    return state.status === 'ready'
      ? { ...state, data: state.data.filter((a) => a.featured).slice(0, 6) }
      : state;
  });

  protected readonly attractionCount = computed(() => {
    const state = this.attractions();
    return state.status === 'ready' ? state.data.length : null;
  });
}
