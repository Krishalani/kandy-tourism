import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Depends on the guest plan referenced from the visitor's browser, so render it on the client.
    path: 'my-plan',
    renderMode: RenderMode.Client,
  },
  {
    // Attraction data comes from the Web API, so these pages are rendered per request (not at
    // build time) and always reflect the current database.
    path: '',
    renderMode: RenderMode.Server,
  },
  {
    // Filters live in query parameters, which a prerendered page cannot know about.
    path: 'explore',
    renderMode: RenderMode.Server,
  },
  {
    path: 'attractions/:slug',
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
  { path: 'about', renderMode: RenderMode.Prerender },
  { path: 'contact', renderMode: RenderMode.Prerender },
  {
    // Unknown URLs render the in-app "page not found" screen with a real 404 status.
    path: '**',
    renderMode: RenderMode.Server,
    status: 404,
  },
];
