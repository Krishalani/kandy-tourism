import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Icon } from '../icon/icon';

/** Renders the active `ConfirmService` request in a native modal dialog. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './confirm-dialog.scss',
  template: `
    <dialog
      #dialog
      class="dialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      (close)="onClose()"
      (cancel)="answer(false)"
    >
      @if (confirmService.request(); as request) {
        <div class="confirm">
          <div
            class="confirm__icon"
            [class.confirm__icon--danger]="request.options.tone === 'danger'"
          >
            <app-icon [name]="request.options.tone === 'danger' ? 'alert' : 'info'" [size]="22" />
          </div>
          <h2 id="confirm-title" class="confirm__title">{{ request.options.title }}</h2>
          <p id="confirm-message" class="confirm__message">{{ request.options.message }}</p>
          @if (request.options.details?.length) {
            @if (request.options.detailsLabel) {
              <p class="confirm__details-label">{{ request.options.detailsLabel }}</p>
            }
            <ol class="confirm__details">
              @for (item of request.options.details; track $index) {
                <li>{{ item }}</li>
              }
            </ol>
          }
          <div class="confirm__actions">
            <button type="button" class="btn" autofocus (click)="answer(false)">
              {{ request.options.cancelLabel ?? 'Cancel' }}
            </button>
            <button
              type="button"
              class="btn"
              [class.btn--danger-solid]="request.options.tone === 'danger'"
              [class.btn--primary]="request.options.tone !== 'danger'"
              (click)="answer(true)"
            >
              {{ request.options.confirmLabel ?? 'Confirm' }}
            </button>
          </div>
        </div>
      }
    </dialog>
  `,
})
export class ConfirmDialog {
  protected readonly confirmService = inject(ConfirmService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly injector = inject(Injector);
  private returnFocusTo: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const request = this.confirmService.request();
      const dialog = this.dialog().nativeElement;
      if (request && !dialog.open) {
        this.returnFocusTo = document.activeElement as HTMLElement | null;
        // Open once the dialog content has rendered so the safe (cancel) action receives focus.
        afterNextRender(
          () => {
            if (!dialog.open) {
              dialog.showModal();
            }
            dialog.querySelector<HTMLElement>('[autofocus]')?.focus();
          },
          { injector: this.injector },
        );
      } else if (!request && dialog.open) {
        dialog.close();
      }
    });
  }

  protected answer(confirmed: boolean): void {
    this.confirmService.request()?.resolve(confirmed);
  }

  protected onClose(): void {
    this.confirmService.request()?.resolve(false);
    // If the confirmed action removed the trigger, the caller has already moved focus.
    if (this.returnFocusTo?.isConnected) {
      this.returnFocusTo.focus();
    }
    this.returnFocusTo = null;
  }
}
