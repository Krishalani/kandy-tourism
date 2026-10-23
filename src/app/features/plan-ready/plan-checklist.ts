import { IconName } from '../../shared/components/icon/icons';
import { formatDuration } from '../../shared/pipes/duration.pipe';
import { DailyWeather } from '../../core/models/weather.model';
import { WeatherAdvice } from '../../core/utils/weather';
import { addDays, daysBetween, formatTripDate, relativeTripDay } from '../../core/utils/trip-date';

/** Forecasts reach this many days past today. */
const FORECAST_DAYS_AHEAD = 15;
const FULL_DAY_MINUTES = 6 * 60;
const OVERLOADED_DAY_MINUTES = 8 * 60;

export type ChecklistStatus = 'done' | 'todo' | 'warn' | 'info';

export interface ChecklistItem {
  id: string;
  status: ChecklistStatus;
  icon: IconName;
  title: string;
  detail: string;
}

export interface ChecklistInput {
  today: string;
  stopCount: number;
  startLabel: string;
  tripDate: string | null;
  totalVisitMinutes: number;
  /** `undefined` while loading, `null` if it couldn't be loaded. */
  forecastLoaded: boolean | undefined;
  tripDay: DailyWeather | null;
  advice: WeatherAdvice | null;
}

/** What is settled about the plan and what still needs attention before the trip. */
export function planChecklist(input: ChecklistInput): ChecklistItem[] {
  return [
    {
      id: 'stops',
      status: 'done',
      icon: 'route',
      title: `${input.stopCount} ${input.stopCount === 1 ? 'stop' : 'stops'} in your chosen order`,
      detail: 'The PDF, the map and the Google Maps link all follow this order.',
    },
    {
      id: 'start',
      status: 'done',
      icon: 'flag',
      title: `Starting from ${input.startLabel}`,
      detail: 'You can change the starting point on My Plan.',
    },
    tripDateItem(input),
    weatherItem(input),
    dayLengthItem(input.totalVisitMinutes),
  ];
}

/**
 * Ready once an upcoming trip date is set and nothing is left to do. Weather and day-length
 * warnings are advice, so they don't hold the plan back.
 */
export function isPlanReady(items: readonly ChecklistItem[]): boolean {
  return (
    items.find((item) => item.id === 'date')?.status === 'done' &&
    items.every((item) => item.status !== 'todo')
  );
}

function tripDateItem({ tripDate, today }: ChecklistInput): ChecklistItem {
  if (!tripDate) {
    return {
      id: 'date',
      status: 'todo',
      icon: 'calendar',
      title: 'Choose your trip date',
      detail: 'Pick the day so we can check the weather and add it to your PDF.',
    };
  }
  if (tripDate < today) {
    return {
      id: 'date',
      status: 'warn',
      icon: 'calendar',
      title: `${formatTripDate(tripDate)} has passed`,
      detail: 'Choose a new date for this plan.',
    };
  }
  return {
    id: 'date',
    status: 'done',
    icon: 'calendar',
    title: `${formatTripDate(tripDate)} (${relativeTripDay(tripDate, today)})`,
    detail: 'Your trip day is saved with the plan.',
  };
}

function weatherItem(input: ChecklistInput): ChecklistItem {
  const base = { id: 'weather', icon: 'cloud-sun' as IconName };
  const { tripDate, today } = input;
  if (!tripDate || tripDate < today) {
    return {
      ...base,
      status: 'info',
      title: 'Weather forecast',
      detail: 'Shown here once you choose an upcoming trip date.',
    };
  }
  if (daysBetween(today, tripDate) > FORECAST_DAYS_AHEAD) {
    return {
      ...base,
      status: 'info',
      title: 'Forecast not available yet',
      detail: `Live forecasts cover about two weeks. Check back from ${formatTripDate(addDays(tripDate, -FORECAST_DAYS_AHEAD))}.`,
    };
  }
  if (input.forecastLoaded === undefined) {
    return { ...base, status: 'info', title: 'Checking the forecast…', detail: '' };
  }
  if (!input.tripDay) {
    return {
      ...base,
      status: 'info',
      title: 'Weather couldn’t be loaded right now',
      detail: 'Your plan is fine; check the forecast again closer to the day.',
    };
  }
  const day = input.tripDay;
  const rain =
    day.precipitationProbability === null
      ? ''
      : `, ${day.precipitationProbability}% chance of rain`;
  return {
    ...base,
    status: input.advice?.tone === 'caution' ? 'warn' : 'done',
    icon: input.advice?.icon ?? base.icon,
    title: `${day.summary}, ${Math.round(day.maxTemperatureC)}° / ${Math.round(day.minTemperatureC)}°${rain}`,
    detail: input.advice?.message ?? '',
  };
}

function dayLengthItem(minutes: number): ChecklistItem {
  const base = { id: 'length', icon: 'clock' as IconName };
  if (minutes <= 0) {
    return {
      ...base,
      status: 'info',
      title: 'Visit times not available',
      detail: 'Leave plenty of time for travel between stops.',
    };
  }
  const time = `About ${formatDuration(minutes)} at attractions`;
  if (minutes > OVERLOADED_DAY_MINUTES) {
    return {
      ...base,
      status: 'warn',
      title: time,
      detail:
        'That’s more than most people manage in one day before travel. Consider removing a stop.',
    };
  }
  return {
    ...base,
    status: 'done',
    title: time,
    detail:
      minutes > FULL_DAY_MINUTES
        ? 'A full day: leave time for travel, meals and rest.'
        : 'Travel time between stops comes on top; Google Maps shows it.',
  };
}
