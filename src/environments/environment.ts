/**
 * App configuration.
 * `apiBaseUrl` is reserved for the future ASP.NET Core Web API. This prototype does not
 * call it: all data comes from the mock services in `src/app/core`.
 */
export const environment = {
  production: false,
  dataSource: 'mock' as 'mock' | 'api',
  apiBaseUrl: 'https://localhost:7001/api',
};
