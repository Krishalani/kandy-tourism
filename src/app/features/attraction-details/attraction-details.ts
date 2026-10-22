import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
} from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { GalleryImage } from '../../core/models/attraction.model';
import { AttractionService } from '../../core/services/attraction.service';
import { TripPlanService } from '../../core/services/trip-plan.service';
import { formatCoordinate } from '../../core/utils/geo';
import { toLoadState } from '../../core/utils/load-state';
import { buildGoogleMapsPlaceUrl } from '../../core/utils/route-planner';
import { AddToPlanButton } from '../../shared/components/add-to-plan-button/add-to-plan-button';
import { AttractionCard } from '../../shared/components/attraction-card/attraction-card';
import { Icon } from '../../shared/components/icon/icon';
import { EmptyState } from '../../shared/components/state/empty-state';
import { ErrorState } from '../../shared/components/state/error-state';
import { LoadingState } from '../../shared/components/state/loading-state';
import { ImgFallbackDirective } from '../../shared/directives/img-fallback.directive';
import { CategoryPipe } from '../../shared/pipes/category.pipe';
import { DurationPipe } from '../../shared/pipes/duration.pipe';

const SITE = 'Kandy Day Trip Planner';

@Component({
  selector: 'app-attraction-details',
  imports: [
    RouterLink,
    Icon,
    AddToPlanButton,
    AttractionCard,
    EmptyState,
    ErrorState,
    LoadingState,
    ImgFallbackDirective,
    CategoryPipe,
    DurationPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './attraction-details.scss',
  templateUrl: './attraction-details.html',
})
export default class AttractionDetails {
  private readonly attractionService = inject(AttractionService);
  protected readonly plan = inject(TripPlanService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  /** Resolved from the `:slug` route parameter, so one page serves every attraction. */
  protected readonly state = toLoadState(
    inject(ActivatedRoute).paramMap.pipe(
      map((params) => params.get('slug') ?? ''),
      distinctUntilChanged(),
      switchMap((slug) => this.attractionService.getAttractionBySlug(slug)),
      switchMap((attraction) =>
        attraction
          ? this.attractionService
              .getNearbyAttractions(attraction.id, 3)
              .pipe(map((nearby) => ({ attraction, nearby })))
          : of(null),
      ),
    ),
    'We couldn’t load this attraction right now.',
  );

  protected readonly attraction = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? (state.data?.attraction ?? null) : null;
  });

  protected readonly images = computed<GalleryImage[]>(() => {
    const a = this.attraction();
    if (!a) {
      return [];
    }
    return [{ url: a.imageUrl, alt: a.imageAlt, credit: a.imageCredit }, ...a.gallery];
  });

  protected readonly selectedIndex = linkedSignal({
    source: () => this.attraction()?.id,
    computation: () => 0,
  });

  protected readonly selectedImage = computed(
    () => this.images()[this.selectedIndex()] ?? this.images()[0],
  );

  protected readonly coordinates = computed(() => {
    const a = this.attraction();
    return a ? formatCoordinate(a) : '';
  });

  protected readonly placeUrl = computed(() => {
    const a = this.attraction();
    return a ? buildGoogleMapsPlaceUrl(a) : '';
  });

  protected readonly stopNumber = computed(() => {
    const a = this.attraction();
    return a ? this.plan.stopNumberOf(a.id) : undefined;
  });

  constructor() {
    effect(() => {
      const state = this.state();
      if (state.status !== 'ready') {
        return;
      }
      const a = state.data?.attraction;
      this.title.setTitle(a ? `${a.name} | ${SITE}` : `Attraction not found | ${SITE}`);
      if (a) {
        this.meta.updateTag({ name: 'description', content: a.shortDescription });
      }
    });
  }

  protected formatDistance(km: number): string {
    const value = km < 10 ? km.toFixed(1) : Math.round(km).toString();
    return `About ${value} km away (straight line)`;
  }
}
