import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map } from 'rxjs';
import { apiUrl } from '../api/api';
import { AdminProfile, LoginResponse } from '../models/admin.model';

interface AdminSession {
  accessToken: string;
  expiresAt: number;
  admin: AdminProfile;
}

/**
 * Admin sign-in against the Web API. The access token is kept in memory only (never in
 * localStorage/sessionStorage), so reloading the page requires signing in again. All data is
 * protected by the API; the route guard is only a navigation convenience.
 */
@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly http = inject(HttpClient);
  private readonly session = signal<AdminSession | null>(null);

  readonly admin = computed(() => this.session()?.admin ?? null);

  isSignedIn(): boolean {
    const session = this.session();
    return session !== null && session.expiresAt > Date.now();
  }

  accessToken(): string | null {
    return this.isSignedIn() ? this.session()!.accessToken : null;
  }

  signIn(email: string, password: string): Observable<AdminProfile> {
    return this.http
      .post<LoginResponse>(apiUrl('/auth/login'), { email: email.trim(), password })
      .pipe(
        map((response) => {
          this.session.set({
            accessToken: response.accessToken,
            expiresAt: Date.parse(response.expiresAtUtc),
            admin: response.admin,
          });
          return response.admin;
        }),
      );
  }

  signOut(): void {
    this.session.set(null);
  }
}
