import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { AttractionService } from './core/services/attraction.service';
import { MockAttractionService } from './core/services/mock-attraction.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideClientHydration(withEventReplay()),
    // Data source binding. Replace with an HttpClient-based implementation (and add
    // provideHttpClient()) when the ASP.NET Core Web API is available.
    { provide: AttractionService, useExisting: MockAttractionService },
  ],
};
