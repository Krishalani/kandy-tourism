import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, map, of, startWith } from 'rxjs';
import { apiErrorMessage } from '../api/api';

export type LoadState<T> =
  { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; message: string };

/**
 * Maps a request into loading → ready/error states. Errors are turned into a displayable message
 * (a dedicated one when the API is unreachable) and never fall back to bundled data.
 */
export function withLoadState<T>(
  source: Observable<T>,
  errorMessage = 'Something went wrong while loading this content.',
): Observable<LoadState<T>> {
  return source.pipe(
    map((data): LoadState<T> => ({ status: 'ready', data })),
    catchError((error: unknown) =>
      of<LoadState<T>>({ status: 'error', message: apiErrorMessage(error, errorMessage) }),
    ),
    startWith<LoadState<T>>({ status: 'loading' }),
  );
}

/**
 * Converts a data-source observable into a signal with explicit loading and error states.
 * During hydration, responses cached by server rendering arrive synchronously, so the hydrated
 * markup matches the server's. Must be called in an injection context.
 */
export function toLoadState<T>(source: Observable<T>, errorMessage?: string): Signal<LoadState<T>> {
  return toSignal(withLoadState(source, errorMessage), { requireSync: true });
}
