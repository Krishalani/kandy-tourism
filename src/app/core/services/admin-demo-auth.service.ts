import { Injectable, inject, signal } from '@angular/core';
import { BrowserStorageService } from './browser-storage.service';

const SESSION_KEY = 'kdtp.admin-demo-session';

/**
 * DEMO ONLY. This is not authentication: the check runs entirely in the browser, the
 * credentials are published on the login page, and anyone can bypass it. It exists only to
 * illustrate the admin flow until real authentication is provided by the backend.
 */
export const DEMO_ADMIN_CREDENTIALS = { username: 'demo', password: 'kandy-demo' } as const;

@Injectable({ providedIn: 'root' })
export class AdminDemoAuthService {
  private readonly storage = inject(BrowserStorageService);

  readonly isSignedIn = signal(this.storage.read(SESSION_KEY, 'session') === true);

  signIn(username: string, password: string): boolean {
    const ok =
      username.trim() === DEMO_ADMIN_CREDENTIALS.username &&
      password === DEMO_ADMIN_CREDENTIALS.password;
    if (ok) {
      this.storage.write(SESSION_KEY, true, 'session');
      this.isSignedIn.set(true);
    }
    return ok;
  }

  signOut(): void {
    this.storage.remove(SESSION_KEY, 'session');
    this.isSignedIn.set(false);
  }
}
