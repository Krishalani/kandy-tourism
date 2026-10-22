import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, map, of, startWith } from 'rxjs';

export type LoadState<T> =
  { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; message: string };

/**
 * Converts a data-source observable into a signal with explicit loading and error states.
 * Synchronous sources (the mock service) resolve immediately, so server-rendered and
 * hydrated markup match; asynchronous sources (a future HttpClient service) show loading.
 * Must be called in an injection context.
 */
export function toLoadState<T>(
  source: Observable<T>,
  errorMessage = 'Something went wrong while loading this content.',
): Signal<LoadState<T>> {
  return toSignal(
    source.pipe(
      map((data): LoadState<T> => ({ status: 'ready', data })),
      catchError(() => of<LoadState<T>>({ status: 'error', message: errorMessage })),
      startWith<LoadState<T>>({ status: 'loading' }),
    ),
    { requireSync: true },
  );
}
