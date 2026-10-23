/**
 * App configuration.
 * `apiBaseUrl` points at the ASP.NET Core Web API (`kandy-tourism-backend`). It is used both in
 * the browser and during server-side rendering, so it must be an absolute URL reachable from
 * both. For a deployment, change it to the public API origin (and add this site's origin to the
 * API's `Cors:AllowedOrigins`). Never put secrets here: this file is shipped to every browser.
 * `weatherApiUrl` is Open-Meteo's public forecast endpoint, called directly from the browser
 * (no API key needed).
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:5201/api/v1',
  weatherApiUrl: 'https://api.open-meteo.com/v1/forecast',
};
