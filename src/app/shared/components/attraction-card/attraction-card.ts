import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Attraction } from '../../../core/models/attraction.model';
import { TripPlanService } from '../../../core/services/trip-plan.service';
import { ImgFallbackDirective } from '../../directives/img-fallback.directive';
import { CategoryPipe } from '../../pipes/category.pipe';
import { DurationPipe } from '../../pipes/duration.pipe';
import { AddToPlanButton } from '../add-to-plan-button/add-to-plan-button';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-attraction-card',
  imports: [RouterLink, Icon, AddToPlanButton, ImgFallbackDirective, CategoryPipe, DurationPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './attraction-card.scss',
  template: `
    @let a = attraction();
    @let cat = a.category | category;
    <article class="card attraction-card" [class.attraction-card--in-plan]="stopNumber()">
      <div class="attraction-card__media">
        <img
          [src]="a.imageUrl"
          [alt]="a.imageAlt"
          width="640"
          height="480"
          loading="lazy"
          decoding="async"
          appImgFallback
        />
        <span class="badge badge--solid attraction-card__category">
          <app-icon [name]="cat.icon" [size]="14" /> {{ cat.label }}
        </span>
        @if (stopNumber(); as stop) {
          <span class="badge badge--gold attraction-card__stop">
            <app-icon name="check" [size]="14" /> Stop {{ stop }} in your plan
          </span>
        }
      </div>
      <div class="attraction-card__body">
        @if (distanceLabel()) {
          <p class="attraction-card__distance">{{ distanceLabel() }}</p>
        }
        <h3 class="attraction-card__title">
          <a [routerLink]="['/attractions', a.slug]">{{ a.name }}</a>
        </h3>
        <p class="attraction-card__area"><app-icon name="map-pin" [size]="15" /> {{ a.area }}</p>
        <p class="attraction-card__summary">{{ a.shortDescription }}</p>
        @if (a.estimatedVisitDurationMinutes) {
          <p class="attraction-card__meta">
            <app-icon name="clock" [size]="15" />
            About {{ a.estimatedVisitDurationMinutes | duration }}
            <span class="visually-hidden">estimated visit</span>
          </p>
        }
      </div>
      <div class="attraction-card__actions">
        <a class="btn btn--sm" [routerLink]="['/attractions', a.slug]">
          View details<span class="visually-hidden">: {{ a.name }}</span>
        </a>
        <app-add-to-plan-button [attraction]="a" size="sm" />
      </div>
    </article>
  `,
})
export class AttractionCard {
  readonly attraction = input.required<Attraction>();
  /** Optional context line such as "1.2 km away (straight line)". */
  readonly distanceLabel = input<string>('');

  private readonly plan = inject(TripPlanService);
  protected readonly stopNumber = computed(() => this.plan.stopNumberOf(this.attraction().id));
}
