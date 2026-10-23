import { GARDENS, LAKE, TEMPLE } from '../../../testing/fixtures';
import { AttractionSummary } from '../models/attraction.model';
import { DailyWeather, HourlyWeather, WeatherCondition } from '../models/weather.model';
import {
  dayHeading,
  dayLabel,
  describeWeatherCode,
  formatClock,
  hoursToShow,
  isWetHour,
  planningAdvice,
  uvLevel,
  weatherIcon,
} from './weather';

const lake: AttractionSummary = { ...LAKE, category: 'lakes' };
const gardens: AttractionSummary = { ...GARDENS, category: 'nature' };
const temple: AttractionSummary = { ...TEMPLE, category: 'religious' };

function hour(
  h: number,
  precipitationProbability: number | null,
  condition: WeatherCondition = 'partly-cloudy',
): HourlyWeather {
  return {
    time: `${String(h).padStart(2, '0')}:00`,
    hour: h,
    temperatureC: 26,
    precipitationProbability,
    condition,
    summary: condition,
  };
}

/** A day whose hours are dry except where `wet` returns a condition. */
function day(
  wet: (h: number) => WeatherCondition | null = () => null,
  overrides: Partial<DailyWeather> = {},
): DailyWeather {
  return {
    date: '2026-10-24',
    condition: 'partly-cloudy',
    summary: 'Partly cloudy',
    maxTemperatureC: 29,
    minTemperatureC: 21,
    precipitationProbability: 40,
    precipitationMm: 1,
    sunrise: '06:01',
    sunset: '18:04',
    uvIndexMax: 6,
    hours: Array.from({ length: 24 }, (_, h) => {
      const condition = wet(h);
      return condition ? hour(h, 80, condition) : hour(h, 10);
    }),
    ...overrides,
  };
}

describe('weather helpers', () => {
  it('describes WMO weather codes, with a safe fallback for unknown codes', () => {
    expect(describeWeatherCode(0)).toEqual({ condition: 'clear', summary: 'Clear sky' });
    expect(describeWeatherCode(81)).toEqual({ condition: 'rain', summary: 'Showers' });
    expect(describeWeatherCode(95).condition).toBe('thunderstorm');
    expect(describeWeatherCode(42)).toEqual({ condition: 'cloudy', summary: 'Mixed conditions' });
  });

  it('picks day and night icons', () => {
    expect(weatherIcon('clear')).toBe('sun');
    expect(weatherIcon('clear', false)).toBe('moon');
    expect(weatherIcon('partly-cloudy', false)).toBe('cloud-moon');
    expect(weatherIcon('thunderstorm')).toBe('cloud-lightning');
  });

  it('formats local clock times', () => {
    expect(formatClock('00:00')).toBe('12 AM');
    expect(formatClock('06:05')).toBe('6:05 AM');
    expect(formatClock('12:30')).toBe('12:30 PM');
    expect(formatClock('14:00')).toBe('2 PM');
  });

  it('labels days relative to today', () => {
    expect(dayLabel('2026-10-23', '2026-10-23')).toBe('Today');
    expect(dayLabel('2026-10-25', '2026-10-23')).toBe('Sun');

    expect(dayHeading('2026-10-23', '2026-10-23')).toBe('Today, 23 October');
    expect(dayHeading('2026-11-01', '2026-10-31')).toBe('Tomorrow, 1 November');
    expect(dayHeading('2026-10-25', '2026-10-23')).toBe('Sunday, 25 October');
  });

  it('uses WHO UV index categories', () => {
    expect([2.9, 3, 6, 8, 11].map(uvLevel)).toEqual([
      'Low',
      'Moderate',
      'High',
      'Very high',
      'Extreme',
    ]);
  });

  it('treats an hour as wet from a 50% chance, or by its condition when there is no chance', () => {
    expect(isWetHour(hour(9, 49, 'rain'))).toBe(false);
    expect(isWetHour(hour(9, 50))).toBe(true);
    expect(isWetHour(hour(9, null, 'drizzle'))).toBe(true);
    expect(isWetHour(hour(9, null, 'cloudy'))).toBe(false);
  });

  it('shows sightseeing hours, from the current hour today and the rest of the night when late', () => {
    expect(hoursToShow(day()).map((h) => h.hour)).toEqual([
      6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ]);
    expect(hoursToShow(day(), 17).map((h) => h.hour)).toEqual([17, 18, 19, 20]);
    expect(hoursToShow(day(), 19).map((h) => h.hour)).toEqual([19, 20, 21, 22, 23]);
    expect(hoursToShow(day(), 22).map((h) => h.hour)).toEqual([22, 23]);
  });
});

describe('planningAdvice', () => {
  it('recommends outdoor stops on a dry day', () => {
    const advice = planningAdvice(day(), [temple, lake, gardens]);
    expect(advice.tone).toBe('good');
    expect(advice.message).toContain('a good day for Kandy Lake and Royal Botanical Gardens');
  });

  it('warns about strong sun on a dry day with a high UV index', () => {
    const advice = planningAdvice(day(undefined, { uvIndexMax: 9.4 }), [lake]);
    expect(advice.tone).toBe('good');
    expect(advice.message).toContain('UV 9');
    expect(advice.message).toContain('especially at Kandy Lake');
  });

  it('suggests visiting outdoor stops before afternoon rain', () => {
    const advice = planningAdvice(
      day((h) => (h >= 14 && h <= 17 ? 'rain' : null)),
      [temple, lake],
    );
    expect(advice).toEqual({
      tone: 'caution',
      icon: 'umbrella',
      message: 'Rain is likely from about 2 PM. Visit Kandy Lake earlier in the day.',
    });
  });

  it('suggests indoor stops first when only the morning is wet', () => {
    const advice = planningAdvice(
      day((h) => (h >= 7 && h <= 9 ? 'drizzle' : null)),
      [gardens],
    );
    expect(advice.message).toBe(
      'Rain is likely in the morning. Start with indoor stops and save Royal Botanical Gardens for the afternoon.',
    );
  });

  it('flags a mostly wet day', () => {
    const advice = planningAdvice(
      day((h) => (h >= 6 && h <= 17 ? 'rain' : null)),
      [temple],
    );
    expect(advice.message).toBe(
      'Rain is likely for much of the day. Pack an umbrella and allow extra time between stops.',
    );
  });

  it('puts thunderstorms first', () => {
    const advice = planningAdvice(
      day((h) => (h === 15 ? 'thunderstorm' : h === 9 ? 'rain' : null)),
      [lake],
    );
    expect(advice.icon).toBe('cloud-lightning');
    expect(advice.message).toContain('from about 3 PM');
    expect(advice.message).toContain('Visit Kandy Lake before then');
  });

  it('talks about the rest of the day when part of today has passed', () => {
    const advice = planningAdvice(
      day((h) => (h >= 15 ? 'rain' : null)),
      [temple],
      16,
    );
    expect(advice.message).toContain('Rain is likely for the rest of the day.');
  });

  it('ignores hours that have already passed today', () => {
    const advice = planningAdvice(
      day((h) => (h <= 10 ? 'rain' : null)),
      [lake],
      13,
    );
    expect(advice.tone).toBe('good');
  });

  it('says when sightseeing hours are over for today', () => {
    const advice = planningAdvice(day(), [lake], 21);
    expect(advice.message).toContain('Sightseeing hours are over for today');
  });

  it('refers to "your outdoor stops" when there are many', () => {
    const many = [1, 2, 3, 4].map((id) => ({ ...lake, id, name: `Lake ${id}` }));
    const advice = planningAdvice(
      day((h) => (h >= 15 ? 'rain' : null)),
      many,
    );
    expect(advice.message).toContain('Visit your outdoor stops earlier in the day.');
  });
});
