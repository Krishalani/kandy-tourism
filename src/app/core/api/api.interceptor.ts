import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, timeout } from 'rxjs';
import { AdminAuthService } from '../services/admin-auth.service';
import { API_BASE_URL, API_TIMEOUT_MS } from './api';

/**
 * For Web API requests: applies a timeout, attaches the admin bearer token to admin endpoints,
 * and sends the admin back to sign-in when the API rejects an expired or revoked token.
 */
export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(API_BASE_URL)) {
    return next(request);
  }

  const path = request.url.slice(API_BASE_URL.length);
  const isAdminRequest = path.startsWith('/admin/') || path === '/auth/me';
  const auth = inject(AdminAuthService);
  const router = inject(Router);
  const token = isAdminRequest ? auth.accessToken() : null;
  const authorized = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authorized).pipe(
    timeout({ first: API_TIMEOUT_MS }),
    catchError((error: unknown) => {
      if (isAdminRequest && error instanceof HttpErrorResponse && error.status === 401) {
        auth.signOut();
        const returnUrl = router.url.startsWith('/admin') ? router.url : '/admin';
        void router.navigate(['/admin/login'], { queryParams: { returnUrl, reason: 'expired' } });
      }
      return throwError(() => error);
    }),
  );
};
