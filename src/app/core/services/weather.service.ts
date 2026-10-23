import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay, tap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WEATHER_LOCATION } from '../data/site-content';
import {
  DailyWeather,
  HourlyWeather,
  WeatherForecast,
  WeatherLocation,
} from '../models/weather.model';
import { describeWeatherCode } from '../utils/weather';

/** A fetched forecast is reused for this long before Open-Meteo is asked again. */
export const WEATHER_CACHE_MS = 15 * 60_000;
const WEATHER_TIMEOUT_MS = 10_000;
/** Today plus 15 days: the longest range Open-Meteo forecasts. */
const FORECAST_DAYS = 16;

/** The parts of Open-Meteo's `/v1/forecast` response that are requested. */
export interface OpenMeteoResponse {
  current?: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    is_day: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: (number | null)[];
    precipitation_probability: (number | null)[];
    weather_code: (number | null)[];
  };
  daily?: {
    time: string[];
    weather_code: (number | null)[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    precipitation_probability_max: (number | null)[];
    precipitation_sum: (number | null)[];
    sunrise: (string | null)[];
    sunset: (string | null)[];
    uv_index_max: (number | null)[];
  };
}

/** Live forecast for Kandy from Open-Meteo (free, no API key, CORS-enabled). */
@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly http = inject(HttpClient);
  private cache: { fetchedAt: number; forecast$: Observable<WeatherForecast> } | null = null;

  getForecast(): Observable<WeatherForecast> {
    const now = Date.now();
    if (!this.cache || now - this.cache.fetchedAt > WEATHER_CACHE_MS) {
      const forecast$ = this.http
        .get<OpenMeteoResponse>(environment.weatherApiUrl, {
          params: forecastParams(WEATHER_LOCATION),
        })
        .pipe(
          timeout({ first: WEATHER_TIMEOUT_MS }),
          map((response) => toWeatherForecast(response, WEATHER_LOCATION, new Date())),
          // Don't keep a failure: the next request (e.g. "Try again") asks the provider again.
          tap({ error: () => (this.cache = null) }),
          shareReplay(1),
        );
      this.cache = { fetchedAt: now, forecast$ };
    }
    return this.cache.forecast$;
  }
}

function forecastParams(location: WeatherLocation): Record<string, string | number> {
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: location.timeZone,
    forecast_days: FORECAST_DAYS,
    current: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'is_day',
    ].join(','),
    hourly: ['temperature_2m', 'precipitation_probability', 'weather_code'].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'precipitation_sum',
      'sunrise',
      'sunset',
      'uv_index_max',
    ].join(','),
  };
}

/** Converts Open-Meteo's column-oriented response into per-day forecasts with their hours. */
export function toWeatherForecast(
  response: OpenMeteoResponse,
  location: WeatherLocation,
  retrievedAt: Date,
): WeatherForecast {
  const { current, hourly, daily } = response;
  if (!current || !hourly?.time || !daily?.time) {
    throw new Error('The weather service returned incomplete data.');
  }

  const hoursByDate = new Map<string, HourlyWeather[]>();
  hourly.time.forEach((time, i) => {
    const temperature = hourly.temperature_2m[i];
    const code = hourly.weather_code[i];
    if (temperature == null || code == null) {
      return;
    }
    const [date, clock] = time.split('T');
    const hours = hoursByDate.get(date) ?? [];
    hours.push({
      time: clock,
      hour: Number(clock.slice(0, 2)),
      temperatureC: temperature,
      precipitationProbability: hourly.precipitation_probability[i] ?? null,
      ...describeWeatherCode(code),
    });
    hoursByDate.set(date, hours);
  });

  const days = daily.time.flatMap((date, i): DailyWeather[] => {
    const code = daily.weather_code[i];
    const max = daily.temperature_2m_max[i];
    const min = daily.temperature_2m_min[i];
    if (code == null || max == null || min == null) {
      return [];
    }
    return [
      {
        date,
        ...describeWeatherCode(code),
        maxTemperatureC: max,
        minTemperatureC: min,
        precipitationProbability: daily.precipitation_probability_max[i] ?? null,
        precipitationMm: daily.precipitation_sum[i] ?? 0,
        sunrise: clockOf(daily.sunrise[i]),
        sunset: clockOf(daily.sunset[i]),
        uvIndexMax: daily.uv_index_max[i] ?? null,
        hours: hoursByDate.get(date) ?? [],
      },
    ];
  });
  if (days.length === 0) {
    throw new Error('The weather service returned no daily forecast.');
  }

  return {
    location,
    retrievedAt,
    current: {
      time: current.time,
      temperatureC: current.temperature_2m,
      apparentTemperatureC: current.apparent_temperature,
      humidityPercent: current.relative_humidity_2m,
      precipitationMm: current.precipitation,
      windSpeedKmh: current.wind_speed_10m,
      isDay: current.is_day === 1,
      ...describeWeatherCode(current.weather_code),
    },
    days,
  };
}

/** `2026-10-23T06:01` → `06:01`. */
function clockOf(dateTime: string | null | undefined): string | null {
  return dateTime ? dateTime.slice(11, 16) : null;
}
