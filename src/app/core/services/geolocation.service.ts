import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GeoPoint } from '../models/trip-plan.model';

export type GeolocationFailure = 'unsupported' | 'denied' | 'unavailable' | 'timeout';

export class GeolocationError extends Error {
  constructor(readonly reason: GeolocationFailure) {
    super(reason);
  }
}

/** Requests the device location only when the tourist explicitly asks for it. */
@Injectable({ providedIn: 'root' })
export class GeolocationService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  get isSupported(): boolean {
    return this.isBrowser && 'geolocation' in navigator;
  }

  requestCurrentPosition(): Promise<GeoPoint> {
    if (!this.isSupported) {
      return Promise.reject(new GeolocationError('unsupported'));
    }
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        (error) => {
          const reason: GeolocationFailure =
            error.code === error.PERMISSION_DENIED
              ? 'denied'
              : error.code === error.TIMEOUT
                ? 'timeout'
                : 'unavailable';
          reject(new GeolocationError(reason));
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
      );
    });
  }
}
