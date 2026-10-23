import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ItineraryStop } from '../../../core/models/trip-plan.model';
import { DurationPipe } from '../../pipes/duration.pipe';
import { Icon } from '../icon/icon';

/** Read-only start → stops timeline used when reviewing or sharing a plan. */
@Component({
  selector: 'app-itinerary-timeline',
  imports: [RouterLink, Icon, DurationPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './itinerary-timeline.scss',
  template: `
    <ol class="timeline">
      <li class="item item--start">
        <span class="marker" aria-hidden="true"><app-icon name="flag" [size]="14" /></span>
        <div>
          <span class="label">Start</span>
          <span class="name">{{ startLabel() }}</span>
        </div>
      </li>
      @for (stop of stops(); track stop.attraction.id) {
        <li class="item">
          <span class="marker" aria-hidden="true">{{ stop.order }}</span>
          <div>
            <span class="visually-hidden">Stop {{ stop.order }}: </span>
            <a class="name" [routerLink]="['/attractions', stop.attraction.slug]">{{
              stop.attraction.name
            }}</a>
            <span class="meta">
              {{ stop.attraction.area }}
              @if (stop.attraction.estimatedVisitDurationMinutes; as minutes) {
                · about {{ minutes | duration }}
              }
              @if (stop.isFinal) {
                · final stop
              }
            </span>
          </div>
        </li>
      }
    </ol>
  `,
})
export class ItineraryTimeline {
  readonly startLabel = input.required<string>();
  readonly stops = input.required<readonly ItineraryStop[]>();
}
