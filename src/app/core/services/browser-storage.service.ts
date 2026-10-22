import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type StorageArea = 'local' | 'session';

/**
 * JSON wrapper around Web Storage that is safe during server rendering and when storage
 * is unavailable (private browsing, quota errors) or contains corrupted data.
 */
@Injectable({ providedIn: 'root' })
export class BrowserStorageService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  read(key: string, area: StorageArea = 'local'): unknown {
    const storage = this.storage(area);
    if (!storage) {
      return null;
    }
    try {
      const raw = storage.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    } catch {
      return null;
    }
  }

  write(key: string, value: unknown, area: StorageArea = 'local'): boolean {
    const storage = this.storage(area);
    if (!storage) {
      return false;
    }
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  remove(key: string, area: StorageArea = 'local'): void {
    try {
      this.storage(area)?.removeItem(key);
    } catch {
      // Storage can throw when access is blocked; nothing to clean up in that case.
    }
  }

  private storage(area: StorageArea): Storage | null {
    if (!this.isBrowser) {
      return null;
    }
    try {
      return area === 'local' ? window.localStorage : window.sessionStorage;
    } catch {
      return null;
    }
  }
}
