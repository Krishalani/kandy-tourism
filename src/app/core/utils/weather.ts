import { IconName } from '../../shared/components/icon/icons';
import { AttractionSummary } from '../models/attraction.model';
import { DailyWeather, HourlyWeather, WeatherCondition } from '../models/weather.model';

/** Hours (local, inclusive) when tourists are likely to be out sightseeing. */
export const SIGHTSEEING_START_HOUR = 6;
export const SIGHTSEEING_END_HOUR = 20;

/** An hour counts as wet from this chance of precipitation upwards. */
export const WET_PROBABILITY = 50;

/** Categories whose stops are mostly in the open, so rain and storms affect them most. */
const OUTDOOR_CATEGORIES: ReadonlySet<string> = new Set(['nature', 'viewpoints', 'lakes']);

const WET_CONDITIONS: ReadonlySet<WeatherCondition> = new Set(['drizzle', 'rain', 'thunderstorm']);

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * WMO weather interpretation codes, as returned by Open-Meteo.
 * @see https://open-meteo.com/en/docs#weather_variable_documentation
 */
const WMO_CODES: Readonly<Record<number, readonly [WeatherCondition, string]>> = {
  0: ['clear', 'Clear sky'],
  1: ['clear', 'Mainly clear'],
  2: ['partly-cloudy', 'Partly cloudy'],
  3: ['cloudy', 'Overcast'],
  45: ['fog', 'Fog'],
  48: ['fog', 'Fog'],
  51: ['drizzle', 'Light drizzle'],
  53: ['drizzle', 'Drizzle'],
  55: ['drizzle', 'Heavy drizzle'],
  56: ['drizzle', 'Freezing drizzle'],
  57: ['drizzle', 'Freezing drizzle'],
  61: ['rain', 'Light rain'],
  63: ['rain', 'Rain'],
  65: ['rain', 'Heavy rain'],
  66: ['rain', 'Freezing rain'],
  67: ['rain', 'Freezing rain'],
  71: ['snow', 'Light snow'],
  73: ['snow', 'Snow'],
  75: ['snow', 'Heavy snow'],
  77: ['snow', 'Snow grains'],
  80: ['rain', 'Light showers'],
  81: ['rain', 'Showers'],
  82: ['rain', 'Heavy showers'],
  85: ['snow', 'Snow showers'],
  86: ['snow', 'Heavy snow showers'],
  95: ['thunderstorm', 'Thunderstorm'],
  96: ['thunderstorm', 'Thunderstorm with hail'],
  99: ['thunderstorm', 'Thunderstorm with hail'],
};

export function describeWeatherCode(code: number): {
  condition: WeatherCondition;
  summary: string;
} {
  const [condition, summary] = WMO_CODES[code] ?? ['cloudy', 'Mixed conditions'];
  return { condition, summary };
}

export function weatherIcon(condition: WeatherCondition, isDay = true): IconName {
  switch (condition) {
    case 'clear':
      return isDay ? 'sun' : 'moon';
    case 'partly-cloudy':
      return isDay ? 'cloud-sun' : 'cloud-moon';
    case 'cloudy':
      return 'cloud';
    case 'fog':
      return 'cloud-fog';
    case 'drizzle':
      return 'cloud-drizzle';
    case 'rain':
      return 'cloud-rain';
    case 'snow':
      return 'cloud-snow';
    case 'thunderstorm':
      return 'cloud-lightning';
  }
}

/** Formats a local `HH:mm` time as "2 PM" or "6:05 AM". */
export function formatClock(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours < 12 ? 'AM' : 'PM';
  const hour12 = hours % 12 || 12;
  return minutes
    ? `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`
    : `${hour12} ${suffix}`;
}

/** "Today" or a short weekday ("Sat") for a `yyyy-MM-dd` date. */
export function dayLabel(date: string, today: string): string {
  return date === today ? 'Today' : WEEKDAYS[parseDate(date).getUTCDay()];
}

const weekdayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'UTC' });
const dayMonthFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

/** "Today, 23 October", "Tomorrow, 24 October" or "Sunday, 25 October". */
export function dayHeading(date: string, today: string): string {
  const value = parseDate(date);
  const name =
    date === today
      ? 'Today'
      : date === addDays(today, 1)
        ? 'Tomorrow'
        : weekdayFormat.format(value);
  return `${name}, ${dayMonthFormat.format(value)}`;
}

/** WHO UV index categories. */
export function uvLevel(uvIndex: number): string {
  if (uvIndex < 3) return 'Low';
  if (uvIndex < 6) return 'Moderate';
  if (uvIndex < 8) return 'High';
  if (uvIndex < 11) return 'Very high';
  return 'Extreme';
}

export function isDaylight(hour: HourlyWeather, day: DailyWeather): boolean {
  if (!day.sunrise || !day.sunset) {
    return hour.hour >= 6 && hour.hour < 18;
  }
  return hour.time >= day.sunrise.slice(0, 2) + ':00' && hour.time < day.sunset;
}

export function isWetHour(hour: HourlyWeather): boolean {
  return hour.precipitationProbability === null
    ? WET_CONDITIONS.has(hour.condition)
    : hour.precipitationProbability >= WET_PROBABILITY;
}

/** From this hour on, the rest of the night is shown so the hourly strip isn't nearly empty. */
const EVENING_HOUR = 18;

/**
 * The hours worth showing for a day: sightseeing hours, starting from `fromHour` (the current
 * hour when the day is today). In the evening the rest of the night is shown instead.
 */
export function hoursToShow(day: DailyWeather, fromHour = SIGHTSEEING_START_HOUR): HourlyWeather[] {
  const start = Math.max(fromHour, SIGHTSEEING_START_HOUR);
  const end = start >= EVENING_HOUR ? 23 : SIGHTSEEING_END_HOUR;
  return day.hours.filter((h) => h.hour >= start && h.hour <= end);
}

export interface WeatherAdvice {
  tone: 'good' | 'caution';
  icon: IconName;
  message: string;
}

/**
 * One practical tip for the chosen day, based on rain, storms and UV during the remaining
 * sightseeing hours and on which of the tourist's stops are outdoors.
 */
export function planningAdvice(
  day: DailyWeather,
  stops: readonly AttractionSummary[],
  fromHour = SIGHTSEEING_START_HOUR,
): WeatherAdvice {
  const start = Math.max(fromHour, SIGHTSEEING_START_HOUR);
  const hours = day.hours.filter((h) => h.hour >= start && h.hour <= SIGHTSEEING_END_HOUR);
  if (hours.length === 0) {
    return {
      tone: 'good',
      icon: 'moon',
      message: 'Sightseeing hours are over for today. Choose another day to see its forecast.',
    };
  }

  const outdoor = stops.filter((s) => OUTDOOR_CATEGORIES.has(s.category)).map((s) => s.name);
  const outdoorText = listNames(outdoor);
  const storm = hours.find((h) => h.condition === 'thunderstorm' && isWetHour(h));
  const wet = hours.filter(isWetHour);

  if (storm) {
    return {
      tone: 'caution',
      icon: 'cloud-lightning',
      message:
        `Thunderstorms are possible from about ${formatClock(storm.time)}. ` +
        (outdoorText
          ? `Visit ${outdoorText} before then and avoid open viewpoints during a storm.`
          : 'Plan to be indoors then.'),
    };
  }

  if (wet.length === 0) {
    const uv = day.uvIndexMax ?? 0;
    if (uv >= 8) {
      return {
        tone: 'good',
        icon: 'sun',
        message:
          `Dry for sightseeing, but the sun is strong (UV ${Math.round(uv)}). Bring water and sun ` +
          `protection${outdoorText ? `, especially at ${outdoorText}` : ''}.`,
      };
    }
    return {
      tone: 'good',
      icon: 'check',
      message: outdoorText
        ? `Looks dry during sightseeing hours, a good day for ${outdoorText}.`
        : 'Looks dry during sightseeing hours.',
    };
  }

  if (wet.length >= hours.length * 0.6) {
    const span = start > SIGHTSEEING_START_HOUR ? 'the rest of the day' : 'much of the day';
    return {
      tone: 'caution',
      icon: 'umbrella',
      message:
        `Rain is likely for ${span}. Pack an umbrella and allow extra time between stops.` +
        (outdoorText ? ` ${capitalize(outdoorText)} may be less enjoyable in the rain.` : ''),
    };
  }

  const first = wet[0];
  if (wet.every((h) => h.hour < 12)) {
    return {
      tone: 'caution',
      icon: 'umbrella',
      message:
        'Rain is likely in the morning. ' +
        (outdoorText
          ? `Start with indoor stops and save ${outdoorText} for the afternoon.`
          : 'Keep an umbrella handy between stops.'),
    };
  }
  return {
    tone: 'caution',
    icon: 'umbrella',
    message:
      `Rain is likely from about ${formatClock(first.time)}. ` +
      (outdoorText && first.hour >= 10
        ? `Visit ${outdoorText} earlier in the day.`
        : 'Keep an umbrella handy between stops.'),
  };
}

function listNames(names: readonly string[]): string {
  if (names.length > 3) {
    return 'your outdoor stops';
  }
  if (names.length <= 1) {
    return names[0] ?? '';
  }
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function addDays(date: string, days: number): string {
  const result = parseDate(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
