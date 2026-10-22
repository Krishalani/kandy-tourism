import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Skeleton placeholder announced to assistive technology as a busy region. */
@Component({
  selector: 'app-loading-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './state.scss',
  template: `
    <div class="loading" role="status" aria-live="polite">
      <span class="visually-hidden">{{ label() }}</span>
      <div class="loading__grid" aria-hidden="true">
        @for (item of placeholders(); track $index) {
          <div class="skeleton">
            <div class="skeleton__media"></div>
            <div class="skeleton__line skeleton__line--title"></div>
            <div class="skeleton__line"></div>
            <div class="skeleton__line skeleton__line--short"></div>
          </div>
        }
      </div>
    </div>
  `,
})
export class LoadingState {
  readonly label = input('Loading…');
  readonly count = input(3);

  protected placeholders(): unknown[] {
    return Array.from({ length: this.count() });
  }
}
