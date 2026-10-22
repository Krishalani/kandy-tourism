import { Pipe, PipeTransform } from '@angular/core';

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes) || minutes <= 0) {
    return '';
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) {
    return `${mins} min`;
  }
  const hourText = `${hours} hr${hours === 1 ? '' : 's'}`;
  return mins === 0 ? hourText : `${hourText} ${mins} min`;
}

/** Formats minutes as "45 min", "1 hr 30 min" or "2 hrs". */
@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(minutes: number | null | undefined): string {
    return formatDuration(minutes);
  }
}
