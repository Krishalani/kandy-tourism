# Kandy Day Trip Planner

A website that helps visitors discover attractions in Kandy, Sri Lanka, add them to **My Plan**,
arrange them in their own order, preview the stops on a map and open the same ordered route in
Google Maps.

Built with Angular 22 (standalone components, signals, SSR), Angular CDK drag-and-drop and Leaflet
with OpenStreetMap tiles. Data comes from the ASP.NET Core Web API in
[`../kandy-tourism-backend`](../kandy-tourism-backend) (SQL Server via EF Core).

## Running locally

Requires a Node.js version supported by Angular 22 (tested with Node 24) and npm, plus the API
running at `http://localhost:5201` (see the backend README for its one-time setup).

```bash
# terminal 1 – API (from kandy-tourism-backend/kandy-tourism-backend)
dotnet run --launch-profile http

# terminal 2 – website
npm install
npm start            # dev server at http://localhost:4200 (server-side rendering included)
npm test             # unit tests (Vitest), add -- --watch=false for a single run
npm run build        # production build into dist/
```

To run the production server build locally:

```powershell
$env:NG_ALLOWED_HOSTS = 'localhost'   # Angular SSR rejects unknown Host headers by default
npm run serve:ssr:kandy-tourism       # http://localhost:4000
```

### API configuration

The API base URL is set once in `src/environments/environment.ts` (`apiBaseUrl`). It is used both
in the browser and during server-side rendering, so it must be an absolute URL reachable from
both. For a deployment, change it to the public API origin and add the site's origin to the API's
`Cors:AllowedOrigins`. The file contains no secrets.

## Features

- **Home** – hero, category shortcuts, featured attractions (from the API), how it works.
- **Explore** – server-side search, category chips, visit-length filter, sorting, result count,
  "Show more" paging. Filters are kept in the URL (`/explore?q=temple&category=religious`).
- **Attraction details** (`/attractions/:slug`) – gallery, description, visitor tips, labelled
  estimates, coordinates (flagged when approximate), nearby places, add/remove from plan.
- **My Plan** – start point (preset, an attraction, typed address, or opt-in current location),
  numbered stops with drag-and-drop _and_ accessible move up/down buttons, remove with undo,
  Leaflet route preview in the same order, trip summary, **Open Directions in Google Maps**,
  copy link, print, clear plan, optional "Suggest an order". The plan is saved on the server as an
  anonymous guest itinerary — no account needed.
- **About** and **Contact** (validated form; nothing is sent).
- **Admin** (`/admin`) – sign-in against the API, dashboard, search/filter table, add/edit/delete
  attractions. Admin accounts are created on the backend (see its README).

## How data flows

```
src/app
├── core
│   ├── api/             API base URL, error helpers, interceptor (timeout, admin token, 401 handling)
│   ├── data/            static page content (hero/about images, placeholder contact, sample-day slugs)
│   ├── guards/          admin route guard (navigation only; the API enforces authorization)
│   ├── models/          API shapes: AttractionSummary, Attraction, Itinerary, …
│   ├── services/        AttractionService, CatalogService (categories, start points),
│   │                    ItineraryApiService, TripPlanService, AdminAuthService, …
│   └── utils/           route-planner (Google Maps URL, numbering, summary), geo, load-state
├── features             home, explore, attraction-details, my-plan, about, contact, admin, not-found
├── layouts              public layout
└── shared               icon, logo, attraction card, add-to-plan button, states, toasts, dialogs
src/testing              test fixtures (unit tests only)
```

- **One source of truth for the itinerary.** `TripPlanService` holds the plan returned by the API.
  Changes appear immediately and are saved in order; the server's response is authoritative, and
  if a save fails the plan returns to the last saved state with an explanation. The browser keeps
  only the guest plan reference (`kdtp.guest-plan.v2`: plan ID + access token). The device location
  is used for the session only and never sent.
- **Same order everywhere.** The list, map markers and Google Maps link are all derived from the
  ordered stops in the API response.
- **No silent fallbacks.** If the API can't be reached, pages show an error with "Try again"
  instead of bundled data.
- **Rendering.** Home, Explore and attraction pages are server-rendered per request, and their API
  responses are reused during hydration. About/Contact are prerendered; My Plan and Admin render in
  the browser.

## Current limitations

- Opening hours, fees and visit durations are demo estimates and labelled as such.
- Photos are hotlinked from Wikimedia Commons; map tiles come from OpenStreetMap's public tile
  server, which needs a proper provider for production traffic.
- The map preview joins stops with straight dashed lines, not roads; travel time and distance come
  from Google Maps. "Suggest an order" uses straight-line distances only.
- A typed starting address is passed to Google Maps as text and isn't shown on the preview map.
- Plans are limited to 10 stops (the Google Maps link limit).
- Admin sign-in lasts until the token expires (60 minutes) or the page is reloaded.
- The contact form doesn't send anything.
