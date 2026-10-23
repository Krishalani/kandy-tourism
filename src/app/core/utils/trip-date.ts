/** Sri Lanka is UTC+05:30 all year (no daylight saving). */
const SRI_LANKA_OFFSET_MS = 330 * 60_000;

/** The API accepts trip dates from today up to this many days ahead. */
export const MAX_TRIP_DAYS_AHEAD = 365;

/** Today's date in Sri Lanka, `yyyy-MM-dd`. */
export function sriLankaToday(now: Date = new Date()): string {
  return new Date(now.getTime() + SRI_LANKA_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const result = parseDate(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** e.g. "Saturday 25 October 2026" for a `yyyy-MM-dd` date (built by hand so it reads the same everywhere). */
export function formatTripDate(date: string): string {
  const value = parseDate(date);
  return (
    `${WEEKDAYS[value.getUTCDay()]} ${value.getUTCDate()} ` +
    `${MONTHS[value.getUTCMonth()]} ${value.getUTCFullYear()}`
  );
}

/** "today", "tomorrow", "in 5 days" or "3 days ago", relative to `today`. */
export function relativeTripDay(date: string, today: string): string {
  const days = daysBetween(today, date);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

export function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}
