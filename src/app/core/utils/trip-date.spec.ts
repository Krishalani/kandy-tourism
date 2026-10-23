import { addDays, daysBetween, formatTripDate, relativeTripDay, sriLankaToday } from './trip-date';

describe('trip date helpers', () => {
  it('uses the Sri Lanka calendar day (UTC+05:30)', () => {
    expect(sriLankaToday(new Date('2026-10-23T18:29:00Z'))).toBe('2026-10-23');
    expect(sriLankaToday(new Date('2026-10-23T18:30:00Z'))).toBe('2026-10-24');
  });

  it('adds days and counts the days between dates across month ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
    expect(daysBetween('2026-10-23', '2026-11-07')).toBe(15);
    expect(daysBetween('2026-10-23', '2026-10-20')).toBe(-3);
  });

  it('formats dates for people', () => {
    expect(formatTripDate('2026-10-25')).toBe('Sunday 25 October 2026');
    expect(relativeTripDay('2026-10-23', '2026-10-23')).toBe('today');
    expect(relativeTripDay('2026-10-24', '2026-10-23')).toBe('tomorrow');
    expect(relativeTripDay('2026-10-28', '2026-10-23')).toBe('in 5 days');
    expect(relativeTripDay('2026-10-20', '2026-10-23')).toBe('3 days ago');
  });
});
