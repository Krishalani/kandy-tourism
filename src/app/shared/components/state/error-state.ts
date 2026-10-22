import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-error-state',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './state.scss',
  template: `
    <div class="state state--error" role="alert">
      <span class="state__icon"><app-icon name="alert" [size]="34" /></span>
      <h2 class="state__title">{{ title() }}</h2>
      <p class="state__message">{{ message() }}</p>
      <div class="state__actions">
        @if (retryable()) {
          <button type="button" class="btn btn--primary" (click)="retry.emit()">
            <app-icon name="refresh" [size]="18" /> Try again
          </button>
        }
        <ng-content />
      </div>
    </div>
  `,
})
export class ErrorState {
  readonly title = input('We couldn’t load this content');
  readonly message = input('Please check your connection and try again.');
  readonly retryable = input(false);
  readonly retry = output<void>();
}
