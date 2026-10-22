import { inject } from '@angular/core';
import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';
import { firstValueFrom } from 'rxjs';
import { AttractionService } from './core/services/attraction.service';

export const serverRoutes: ServerRoute[] = [
  {
    // Depends on the plan saved in the visitor's browser, so render it on the client.
    path: 'my-plan',
    renderMode: RenderMode.Client,
  },
  {
    // Filters live in query parameters, which a prerendered page cannot know about.
    path: 'explore',
    renderMode: RenderMode.Server,
  },
  {
    path: 'admin',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'attractions/:slug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,
    async getPrerenderParams() {
      const attractions = await firstValueFrom(inject(AttractionService).getAttractions());
      return attractions.map((a) => ({ slug: a.slug }));
    },
  },
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'about', renderMode: RenderMode.Prerender },
  { path: 'contact', renderMode: RenderMode.Prerender },
  {
    // Unknown URLs render the in-app "page not found" screen with a real 404 status.
    path: '**',
    renderMode: RenderMode.Server,
    status: 404,
  },
];
