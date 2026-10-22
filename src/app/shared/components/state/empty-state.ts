import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

@Component({
  selector: 'app-empty-state',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './state.scss',
  template: `
    <div class="state" [class.state--compact]="compact()">
      <span class="state__icon"><app-icon [name]="icon()" [size]="compact() ? 26 : 34" /></span>
      <h2 class="state__title" [class.h3]="compact()">{{ title() }}</h2>
      @if (message()) {
        <p class="state__message">{{ message() }}</p>
      }
      <div class="state__actions"><ng-content /></div>
    </div>
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly message = input('');
  readonly icon = input<IconName>('compass');
  readonly compact = input(false);
}
