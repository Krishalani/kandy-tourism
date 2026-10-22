import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ToastTone = 'success' | 'info' | 'error';

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
}

const AUTO_DISMISS_MS = 5000;
const MAX_VISIBLE = 3;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private nextId = 1;

  readonly toasts = signal<Toast[]>([]);

  show(message: string, options: { tone?: ToastTone; action?: ToastAction } = {}): void {
    const toast: Toast = {
      id: this.nextId++,
      message,
      action: options.action,
      tone: options.tone ?? 'success',
    };
    this.toasts.update((list) => [...list, toast].slice(-MAX_VISIBLE));
    if (this.isBrowser) {
      setTimeout(
        () => this.dismiss(toast.id),
        options.action ? AUTO_DISMISS_MS * 1.6 : AUTO_DISMISS_MS,
      );
    }
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
