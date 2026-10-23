import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CompleteTripRequest, ItineraryStop } from '../../core/models/trip-plan.model';
import { Icon } from '../../shared/components/icon/icon';
import { StarRating } from '../../shared/components/star-rating/star-rating';

const COMMENT_MAX_LENGTH = 1000;

/** Rating and comment that complete a confirmed trip. Only the overall rating is required. */
@Component({
  selector: 'app-trip-feedback-form',
  imports: [Icon, StarRating],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './trip-feedback-form.scss',
  template: `
    <form class="feedback" novalidate (submit)="$event.preventDefault(); submit()">
      <app-star-rating name="overall-rating" label="How was your day overall?" [(value)]="rating" />
      @if (showRatingError()) {
        <p class="field__error" role="alert">
          <app-icon name="alert" [size]="16" /> Choose a rating from 1 to 5 stars.
        </p>
      }

      @if (stops().length > 0) {
        <div class="feedback__stops">
          <p class="feedback__label">
            Rate the places you visited <span class="muted">(optional)</span>
          </p>
          <ul class="feedback__list">
            @for (stop of stops(); track stop.attraction.id) {
              <li class="feedback__stop">
                <span class="feedback__name">{{ stop.order }}. {{ stop.attraction.name }}</span>
                <app-star-rating
                  size="sm"
                  [name]="'stop-rating-' + stop.attraction.id"
                  [label]="'Your rating for ' + stop.attraction.name"
                  [hideLabel]="true"
                  [value]="stopRatings()[stop.attraction.id] ?? 0"
                  (valueChange)="rateStop(stop.attraction.id, $event)"
                />
              </li>
            }
          </ul>
        </div>
      }

      <div class="field">
        <label class="field__label" for="trip-comment">
          Anything you’d like to share? <span class="muted">(optional)</span>
        </label>
        <textarea
          id="trip-comment"
          class="textarea"
          rows="4"
          [attr.maxlength]="maxLength"
          placeholder="What did you enjoy? Anything we could improve?"
          [value]="comment()"
          (input)="comment.set($any($event.target).value)"
          aria-describedby="trip-comment-count"
        ></textarea>
        <span id="trip-comment-count" class="field__hint">
          {{ comment().length }} / {{ maxLength }} characters
        </span>
      </div>

      <button type="submit" class="btn btn--primary btn--block" [disabled]="saving()">
        <app-icon name="check" [size]="18" />
        {{ saving() ? 'Saving your feedback…' : 'Complete my trip' }}
      </button>
    </form>
  `,
})
export class TripFeedbackForm {
  readonly stops = input.required<readonly ItineraryStop[]>();
  readonly saving = input(false);
  readonly submitted = output<CompleteTripRequest>();

  protected readonly maxLength = COMMENT_MAX_LENGTH;
  protected readonly rating = signal(0);
  protected readonly comment = signal('');
  protected readonly stopRatings = signal<Record<number, number>>({});
  private readonly attempted = signal(false);

  protected readonly showRatingError = computed(() => this.attempted() && this.rating() === 0);

  protected rateStop(attractionId: number, rating: number): void {
    this.stopRatings.update((ratings) => ({ ...ratings, [attractionId]: rating }));
  }

  protected submit(): void {
    this.attempted.set(true);
    if (this.rating() === 0) {
      return;
    }
    const comment = this.comment().trim();
    this.submitted.emit({
      rating: this.rating(),
      comment: comment || undefined,
      stopRatings: this.stops()
        .map((s) => ({
          attractionId: s.attraction.id,
          rating: this.stopRatings()[s.attraction.id] ?? 0,
        }))
        .filter((r) => r.rating > 0),
    });
  }
}
