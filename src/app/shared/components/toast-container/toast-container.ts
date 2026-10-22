import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Toast, ToastService } from '../../../core/services/toast.service';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-toast-container',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './toast-container.scss',
  template: `
    <div class="toasts" role="status" aria-live="polite" aria-atomic="false">
      @for (toast of toastService.toasts(); track toast.id) {
        <div [class]="'toast toast--' + toast.tone">
          <app-icon
            [name]="toast.tone === 'error' ? 'alert' : toast.tone === 'info' ? 'info' : 'check'"
          />
          <p class="toast__message">{{ toast.message }}</p>
          @if (toast.action) {
            <button type="button" class="toast__action" (click)="runAction(toast)">
              {{ toast.action.label }}
            </button>
          }
          <button
            type="button"
            class="toast__close"
            aria-label="Dismiss notification"
            (click)="toastService.dismiss(toast.id)"
          >
            <app-icon name="x" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainer {
  protected readonly toastService = inject(ToastService);

  protected runAction(toast: Toast): void {
    toast.action?.run();
    this.toastService.dismiss(toast.id);
  }
}
