import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  /** Optional ordered list shown in the dialog, e.g. a proposed stop order. */
  details?: string[];
  detailsLabel?: string;
}

export interface ConfirmRequest {
  options: ConfirmOptions;
  resolve: (confirmed: boolean) => void;
}

/** Promise-based confirmation dialog rendered once by `ConfirmDialog` in the app shell. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly request = signal<ConfirmRequest | null>(null);

  confirm(options: ConfirmOptions): Promise<boolean> {
    this.request()?.resolve(false);
    return new Promise<boolean>((resolve) => {
      this.request.set({
        options,
        resolve: (confirmed) => {
          this.request.set(null);
          resolve(confirmed);
        },
      });
    });
  }
}
