import { ChangeDetectionStrategy, Component, input, model, signal } from '@angular/core';
import { ICONS } from '../icon/icons';

const STAR_PATH = ICONS.star[0];
export const RATING_LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'] as const;

/**
 * A 1–5 star picker built from native radio buttons, so arrow keys and screen readers work as
 * for any radio group.
 */
@Component({
  selector: 'app-star-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './star-rating.scss',
  template: `
    <fieldset class="stars" [class.stars--sm]="size() === 'sm'">
      <legend class="stars__legend" [class.visually-hidden]="hideLabel()">{{ label() }}</legend>
      <div class="stars__row" (mouseleave)="hover.set(0)">
        @for (n of options; track n) {
          <label
            class="star"
            [class.star--on]="n <= (hover() || value())"
            (mouseenter)="hover.set(n)"
          >
            <input
              type="radio"
              class="star__input"
              [name]="name()"
              [value]="n"
              [checked]="value() === n"
              (change)="value.set(n)"
            />
            <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="path" /></svg>
            <span class="visually-hidden"
              >{{ n }} {{ n === 1 ? 'star' : 'stars' }}, {{ labels[n - 1] }}</span
            >
          </label>
        }
        @if (value() > 0) {
          <span class="stars__text" aria-hidden="true">{{ labels[value() - 1] }}</span>
        }
      </div>
    </fieldset>
  `,
})
export class StarRating {
  /** Radio group name; must be unique on the page. */
  readonly name = input.required<string>();
  readonly label = input.required<string>();
  readonly hideLabel = input(false);
  readonly size = input<'md' | 'sm'>('md');
  /** 0 while nothing is chosen. */
  readonly value = model(0);

  protected readonly hover = signal(0);
  protected readonly options = [1, 2, 3, 4, 5];
  protected readonly labels = RATING_LABELS;
  protected readonly path = STAR_PATH;
}

/** Read-only stars for showing a saved rating. */
@Component({
  selector: 'app-star-display',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './star-rating.scss',
  template: `
    <span
      class="display"
      [class.stars--sm]="size() === 'sm'"
      role="img"
      [attr.aria-label]="rating() + ' out of 5 stars'"
    >
      @for (n of options; track n) {
        <svg class="star" [class.star--on]="n <= rating()" viewBox="0 0 24 24" aria-hidden="true">
          <path [attr.d]="path" />
        </svg>
      }
    </span>
  `,
})
export class StarDisplay {
  readonly rating = input.required<number>();
  readonly size = input<'md' | 'sm'>('md');

  protected readonly options = [1, 2, 3, 4, 5];
  protected readonly path = STAR_PATH;
}
