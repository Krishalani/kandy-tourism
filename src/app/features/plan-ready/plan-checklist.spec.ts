import { DailyWeather } from '../../core/models/weather.model';
import { ChecklistInput, isPlanReady, planChecklist } from './plan-checklist';

const TODAY = '2026-10-23';

function input(overrides: Partial<ChecklistInput> = {}): ChecklistInput {
  return {
    today: TODAY,
    stopCount: 4,
    startLabel: 'Kandy City Centre',
    tripDate: '2026-10-25',
    totalVisitMinutes: 240,
    forecastLoaded: true,
    tripDay: null,
    advice: null,
    ...overrides,
  };
}

const rainyDay: DailyWeather = {
  date: '2026-10-25',
  condition: 'rain',
  summary: 'Showers',
  maxTemperatureC: 28.4,
  minTemperatureC: 21,
  precipitationProbability: 90,
  precipitationMm: 12,
  sunrise: '05:54',
  sunset: '17:48',
  uvIndexMax: 7,
  hours: [],
};

const item = (items: ReturnType<typeof planChecklist>, id: string) =>
  items.find((i) => i.id === id)!;

describe('planChecklist', () => {
  it('asks for a trip date and is not ready without one', () => {
    const items = planChecklist(input({ tripDate: null }));
    expect(item(items, 'date')).toMatchObject({ status: 'todo', title: 'Choose your trip date' });
    expect(item(items, 'weather').status).toBe('info');
    expect(isPlanReady(items)).toBe(false);
  });

  it('flags a trip date that has passed', () => {
    const items = planChecklist(input({ tripDate: '2026-10-20' }));
    expect(item(items, 'date')).toMatchObject({ status: 'warn' });
    expect(item(items, 'date').title).toContain('has passed');
    expect(isPlanReady(items)).toBe(false);
  });

  it('shows the forecast for the trip day and treats rain as advice, not a blocker', () => {
    const items = planChecklist(
      input({
        tripDay: rainyDay,
        advice: {
          tone: 'caution',
          icon: 'umbrella',
          message: 'Rain is likely for much of the day.',
        },
      }),
    );
    expect(item(items, 'date')).toMatchObject({
      status: 'done',
      title: 'Sunday 25 October 2026 (in 2 days)',
    });
    expect(item(items, 'weather')).toMatchObject({
      status: 'warn',
      icon: 'umbrella',
      title: 'Showers, 28° / 21°, 90% chance of rain',
      detail: 'Rain is likely for much of the day.',
    });
    expect(isPlanReady(items)).toBe(true);
  });

  it('explains when the trip is too far ahead for a forecast', () => {
    const items = planChecklist(input({ tripDate: '2026-12-01' }));
    expect(item(items, 'weather').title).toBe('Forecast not available yet');
    expect(item(items, 'weather').detail).toContain('Monday 16 November 2026');
    expect(isPlanReady(items)).toBe(true);
  });

  it('warns about an overloaded day', () => {
    const items = planChecklist(input({ totalVisitMinutes: 9 * 60 }));
    expect(item(items, 'length')).toMatchObject({
      status: 'warn',
      title: 'About 9 hrs at attractions',
    });
  });
});
