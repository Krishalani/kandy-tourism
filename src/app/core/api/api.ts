import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { environment } from '../../../environments/environment';

export const API_BASE_URL = environment.apiBaseUrl.replace(/\/+$/, '');

/** Requests that take longer than this fail with a "couldn't reach the server" message. */
export const API_TIMEOUT_MS = 15_000;

export const UNREACHABLE_MESSAGE =
  'We couldn’t reach the Kandy Day Trip Planner server. Please check your connection and try again.';

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
}

/** RFC 7807 problem details returned by the API, plus its `code` and field `errors` extensions. */
export interface ApiProblem {
  title?: string;
  detail?: string;
  status?: number;
  code?: string;
  errors?: Record<string, string[]>;
}

export function apiProblem(error: unknown): ApiProblem | null {
  return error instanceof HttpErrorResponse && error.error && typeof error.error === 'object'
    ? (error.error as ApiProblem)
    : null;
}

export function apiErrorCode(error: unknown): string | undefined {
  return apiProblem(error)?.code;
}

export function hasStatus(error: unknown, status: number): boolean {
  return error instanceof HttpErrorResponse && error.status === status;
}

/** True when the API couldn't be reached at all (offline, server down, CORS, or timeout). */
export function isUnreachable(error: unknown): boolean {
  return (
    error instanceof TimeoutError || (error instanceof HttpErrorResponse && error.status === 0)
  );
}

/**
 * A message that is safe to show: the API's own explanation for client errors (4xx), or a
 * fallback. Server errors never expose details.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (isUnreachable(error)) {
    return UNREACHABLE_MESSAGE;
  }
  const problem = apiProblem(error);
  if (
    error instanceof HttpErrorResponse &&
    error.status >= 400 &&
    error.status < 500 &&
    problem?.detail
  ) {
    return problem.detail;
  }
  return fallback;
}
