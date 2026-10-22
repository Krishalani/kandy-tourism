# Kandy Day Trip Planner

A frontend prototype that helps visitors discover attractions in Kandy, Sri Lanka, add them to
**My Plan**, arrange them in their own order, preview the stops on a map and open the same ordered
route in Google Maps.

Built with Angular 22 (standalone components, signals, SSR/prerendering), Angular CDK drag-and-drop
and Leaflet with OpenStreetMap tiles. **There is no backend in this phase** — all data is mock data.

## Running locally

Requires a Node.js version supported by Angular 22 (tested with Node 24) and npm.

```bash
npm install
npm start            # dev server at http://localhost:4200
npm test             # unit tests (Vitest), add -- --watch=false for a single run
npm run build        # production build (SSR + prerendered pages) into dist/
```

To run the production server build locally:

```powershell
$env:NG_ALLOWED_HOSTS = 'localhost'   # Angular SSR rejects unknown Host headers by default
npm run serve:ssr:kandy-tourism       # http://localhost:4000
```

For a real deployment, list your domain in `security.allowedHosts` in `angular.json` instead.

## Features

- **Home** – hero, category shortcuts, featured attractions, how it works, intro to Kandy.
- **Explore** – search, category chips, visit-length filter, sorting, result count, clear filters.
  Filters are kept in the URL (`/explore?q=temple&category=religious`).
- **Attraction details** (`/attractions/:slug`) – gallery, description, visitor tips, demo-labelled
  hours/fees/durations, coordinates (flagged when approximate), nearby places, add/remove from plan.
- **My Plan** – start point (preset, an attraction, typed address, or opt-in current location),
  numbered stops with drag-and-drop _and_ accessible move up/down buttons, remove with undo,
  Leaflet route preview in the same order, trip summary, **Open Directions in Google Maps**,
  copy link, print, clear plan (with confirmation), optional "Suggest an order" (only applied after
  explicit confirmation), saved in `localStorage`.
- **About** and **Contact** (validated demo form; nothing is sent).
- **Admin demo** (`/admin`, credentials shown on the login page) – dashboard, search/filter table,
  add/edit/delete attractions, reset demo data.

## Project structure

```
src/app
├── core
│   ├── data/            mock attractions, start points, site info (prototype data)
│   ├── guards/          admin demo guard (navigation convenience only)
│   ├── models/          typed models: Attraction, TripPlanState, ItineraryStop, …
│   ├── services/        AttractionService (abstract) + MockAttractionService, TripPlanService,
│   │                    toast, confirm dialog, geolocation, storage, admin demo auth
│   └── utils/           route-planner (Google Maps URL, itinerary, summary), filtering, geo
├── features             home, explore, attraction-details, my-plan (+ start picker, itinerary
│                        list, route map, trip summary), about, contact, admin, not-found
├── layouts              public layout (header/footer, focus management)
└── shared               icon, logo, attraction card, add-to-plan button, empty/loading/error
                         states, toast container, confirm dialog, image fallback, pipes
src/styles               design tokens, base styles, shared UI primitives, map styles
```

All itinerary rules live in `TripPlanService` and the pure functions in
`core/utils/route-planner.ts`, so the list, map and Google Maps link always use the same order.

## What is mocked and current limitations

- Attraction data, contact details and start points are hardcoded prototype data. Opening hours,
  fees and visit durations are demo estimates and labelled as such in the UI.
- Coordinates come from Wikipedia/Wikidata where available; four are marked approximate.
- Photos are hotlinked from Wikimedia Commons (credited on each page) and fall back to a local
  placeholder if they fail to load. Map tiles come from OpenStreetMap's public tile server, which
  is fine for a prototype but needs a proper tile provider for production traffic.
- The map preview joins stops with **straight dashed lines**; it is not a road route. Travel time
  and distance are left to Google Maps. "Suggest an order" uses straight-line distances only.
- A typed starting address is passed to Google Maps as text and is not shown on the preview map
  (no geocoding). The current-location option is used for the session only and never saved.
- Google Maps directions links support up to 9 waypoints, so a plan is limited to 10 stops; some
  mobile browsers show only the first 3 waypoints (the UI warns about this).
- The contact form does not send anything. The admin sign-in is **not** authentication; admin
  changes are stored in this browser's `localStorage` only.

## Connecting an ASP.NET Core Web API later

1. Create `HttpAttractionService implements AttractionService` using `HttpClient` and
   `environment.apiBaseUrl` (see `src/environments/environment.ts`). The method names
   (`getAttractions`, `getAttractionById`, `getAttractionBySlug`, `searchAttractions`,
   `createAttraction`, `updateAttraction`, `deleteAttraction`, …) map directly to REST endpoints such
   as `GET /api/attractions`, `GET /api/attractions/{id}`, `POST`, `PUT`, `DELETE`.
2. In `app.config.ts`, add `provideHttpClient(withFetch())` and change the binding
   `{ provide: AttractionService, useExisting: MockAttractionService }` to the HTTP service.
   Components only depend on `AttractionService` and already handle loading and error states.
3. Replace `AdminDemoAuthService` with real authentication (e.g. ASP.NET Core Identity or an
   OpenID Connect provider) and an HTTP interceptor; keep authorisation checks on the server.
4. Optionally move trip plans server-side for signed-in users; `TripPlanState` is already a small,
   versioned, ID-based shape suitable for an API.
