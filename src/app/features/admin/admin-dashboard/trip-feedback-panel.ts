import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminDashboard } from '../../../core/models/admin.model';
import { formatTripDate } from '../../../core/utils/trip-date';
import { Icon } from '../../../shared/components/icon/icon';
import { StarDisplay } from '../../../shared/components/star-rating/star-rating';

/** Trip lifecycle totals and what tourists said after their trips. */
@Component({
  selector: 'app-trip-feedback-panel',
  imports: [RouterLink, DatePipe, DecimalPipe, Icon, StarDisplay],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './trip-feedback-panel.scss',
  template: `
    @let d = data();
    <section class="panel" aria-labelledby="feedback-title">
      <h2 id="feedback-title" class="panel__title"><app-icon name="star" /> Trip feedback</h2>

      <dl class="totals">
        <div>
          <dt>Confirmed trips</dt>
          <dd>{{ d.confirmedTrips }}</dd>
        </div>
        <div>
          <dt>Completed trips</dt>
          <dd>{{ d.completedTrips }}</dd>
        </div>
        <div>
          <dt>Average rating</dt>
          <dd>
            @if (d.averageRating; as average) {
              {{ average | number: '1.1-1' }} <span class="totals__out-of">/ 5</span>
            } @else {
              <span class="muted">No ratings yet</span>
            }
          </dd>
        </div>
      </dl>

      <div class="columns">
        <div>
          <h3 class="sub">Latest feedback</h3>
          @if (d.recentFeedback.length === 0) {
            <p class="muted">Feedback appears here when tourists complete their trips.</p>
          } @else {
            <ul class="reviews">
              @for (f of d.recentFeedback; track f.submittedAtUtc) {
                <li class="review">
                  <div class="review__head">
                    <app-star-display size="sm" [rating]="f.rating" />
                    <time class="muted" [attr.datetime]="f.submittedAtUtc">{{
                      f.submittedAtUtc | date: 'd MMM y'
                    }}</time>
                  </div>
                  <p class="review__comment" [class.muted]="!f.comment">
                    {{ f.comment ? '“' + f.comment + '”' : 'No comment' }}
                  </p>
                  <p class="review__meta">
                    {{ f.stopCount }} {{ f.stopCount === 1 ? 'stop' : 'stops' }}
                    @if (f.tripDate) {
                      · trip on {{ tripDate(f.tripDate) }}
                    }
                  </p>
                </li>
              }
            </ul>
          }
        </div>

        <div>
          <h3 class="sub">Top-rated attractions</h3>
          @if (d.topRatedAttractions.length === 0) {
            <p class="muted">Ratings for individual stops will appear here.</p>
          } @else {
            <ol class="top">
              @for (a of d.topRatedAttractions; track a.slug) {
                <li>
                  <a [routerLink]="['/attractions', a.slug]">{{ a.name }}</a>
                  <span class="top__score">
                    <app-star-display size="sm" [rating]="round(a.averageRating)" />
                    {{ a.averageRating | number: '1.1-1' }}
                    <span class="muted">({{ a.ratingCount }})</span>
                  </span>
                </li>
              }
            </ol>
          }
        </div>
      </div>
    </section>
  `,
})
export class TripFeedbackPanel {
  readonly data = input.required<AdminDashboard>();

  protected readonly round = Math.round;

  protected tripDate(date: string): string {
    return formatTripDate(date);
  }
}
