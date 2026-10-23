import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TripPlanService } from '../../../core/services/trip-plan.service';
import {
  MAX_TRIP_DAYS_AHEAD,
  addDays,
  formatTripDate,
  relativeTripDay,
  sriLankaToday,
} from '../../../core/utils/trip-date';
import { Icon } from '../icon/icon';

/** Chooses the day of the trip; saved with the plan and used for the weather and the PDF. */
@Component({
  selector: 'app-trip-date-picker',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './trip-date-picker.scss',
  templateUrl: './trip-date-picker.html',
})
export class TripDatePicker {
  protected readonly plan = inject(TripPlanService);

  protected readonly today = sriLankaToday();
  protected readonly maxDate = addDays(this.today, MAX_TRIP_DAYS_AHEAD);
  protected readonly error = signal('');
  protected readonly saving = signal(false);

  protected readonly label = computed(() => {
    const date = this.plan.tripDate();
    return date ? `${formatTripDate(date)} (${relativeTripDay(date, this.today)})` : null;
  });
  protected readonly isPast = computed(() => {
    const date = this.plan.tripDate();
    return date !== null && date < this.today;
  });

  protected async choose(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const date = input.value;
    if (!date) {
      return;
    }
    if (date < this.today || date > this.maxDate) {
      input.value = this.plan.tripDate() ?? '';
      this.error.set('Choose a date from today up to a year ahead.');
      return;
    }
    this.error.set('');
    await this.save(date);
  }

  protected async clear(): Promise<void> {
    this.error.set('');
    await this.save(null);
  }

  private async save(date: string | null): Promise<void> {
    this.saving.set(true);
    await this.plan.setTripDate(date);
    this.saving.set(false);
  }
}
