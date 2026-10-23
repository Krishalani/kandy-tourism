/** Simplified sky condition derived from the WMO weather code; drives icons and planning advice. */
export type WeatherCondition =
  'clear' | 'partly-cloudy' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunderstorm';

export interface WeatherLocation {
  name: string;
  latitude: number;
  longitude: number;
  /** IANA time zone; every forecast time is local to it. */
  timeZone: string;
}

export interface CurrentWeather {
  /** Local date and time at the destination, e.g. `2026-10-23T14:45`. */
  time: string;
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPercent: number;
  precipitationMm: number;
  windSpeedKmh: number;
  isDay: boolean;
  condition: WeatherCondition;
  summary: string;
}

export interface HourlyWeather {
  /** Local time, `HH:mm`. */
  time: string;
  hour: number;
  temperatureC: number;
  /** Chance of precipitation (0–100), when the provider has one. */
  precipitationProbability: number | null;
  condition: WeatherCondition;
  summary: string;
}

export interface DailyWeather {
  /** Local date, `yyyy-MM-dd`. */
  date: string;
  condition: WeatherCondition;
  summary: string;
  maxTemperatureC: number;
  minTemperatureC: number;
  precipitationProbability: number | null;
  precipitationMm: number;
  /** Local time, `HH:mm`. */
  sunrise: string | null;
  /** Local time, `HH:mm`. */
  sunset: string | null;
  uvIndexMax: number | null;
  hours: HourlyWeather[];
}

export interface WeatherForecast {
  location: WeatherLocation;
  retrievedAt: Date;
  current: CurrentWeather;
  days: DailyWeather[];
}
