import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, map, of, startWith, switchMap } from 'rxjs';
import { DailyWeather, WeatherForecast } from '../../../core/models/weather.model';
import { TripPlanService } from '../../../core/services/trip-plan.service';
import { WeatherService } from '../../../core/services/weather.service';
import { LoadState } from '../../../core/utils/load-state';
import { dayHeading, dayLabel, planningAdvice, weatherIcon } from '../../../core/utils/weather';
import { Icon } from '../../../shared/components/icon/icon';
import { WeatherDay } from './weather-day';

const LOAD_ERROR =
  'The weather forecast couldn’t be loaded. Please check your connection and try again.';

const updatedFormat = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

const QUICK_DAYS = 7;

/** Live Kandy weather with a 7-day outlook and advice for the tourist's chosen stops. */
@Component({
  selector: 'app-weather-panel',
  imports: [Icon, DecimalPipe, WeatherDay],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './weather-panel.scss',
  templateUrl: './weather-panel.html',
})
export class WeatherPanel {
  private readonly weather = inject(WeatherService);
  private readonly plan = inject(TripPlanService);
  private readonly reload$ = new BehaviorSubject<void>(undefined);

  protected readonly state = toSignal(
    this.reload$.pipe(
      switchMap(() =>
        this.weather.getForecast().pipe(
          map((data): LoadState<WeatherForecast> => ({ status: 'ready', data })),
          catchError(() =>
            of<LoadState<WeatherForecast>>({ status: 'error', message: LOAD_ERROR }),
          ),
          startWith<LoadState<WeatherForecast>>({ status: 'loading' }),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as LoadState<WeatherForecast> },
  );

  private readonly forecast = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.data : null;
  });

  private readonly selectedDate = signal<string | null>(null);

  /** Today's date and hour at the destination, from the provider's current conditions. */
  private readonly today = computed(() => this.forecast()?.current.time.slice(0, 10) ?? '');
  protected readonly currentHour = computed(() =>
    Number(this.forecast()?.current.time.slice(11, 13) ?? 0),
  );

  protected readonly day = computed<DailyWeather | null>(() => {
    const forecast = this.forecast();
    if (!forecast) {
      return null;
    }
    return forecast.days.find((d) => d.date === this.selectedDate()) ?? forecast.days[0];
  });

  protected readonly isToday = computed(() => this.day()?.date === this.today());

  /** The first week gets one-tap buttons; later dates are chosen with the date picker. */
  protected readonly quickDays = computed(() => this.forecast()?.days.slice(0, QUICK_DAYS) ?? []);
  protected readonly firstDate = computed(() => this.forecast()?.days[0]?.date ?? '');
  protected readonly lastDate = computed(() => this.forecast()?.days.at(-1)?.date ?? '');
  protected readonly dateError = signal<string | null>(null);

  protected readonly advice = computed(() => {
    const day = this.day();
    if (!day) {
      return null;
    }
    const stops = this.plan.stops().map((s) => s.attraction);
    return planningAdvice(day, stops, this.isToday() ? this.currentHour() : undefined);
  });

  protected readonly updatedAt = computed(() => {
    const forecast = this.forecast();
    return forecast ? updatedFormat.format(forecast.retrievedAt) : '';
  });

  protected readonly weatherIcon = weatherIcon;

  protected selectDay(date: string): void {
    this.dateError.set(null);
    this.selectedDate.set(date);
  }

  /** Handles the date picker; typed dates outside the forecast range are explained, not guessed. */
  protected pickDate(event: Event): void {
    const input = event.target as HTMLInputElement;
    const date = input.value;
    if (!date) {
      return;
    }
    if (this.forecast()?.days.some((d) => d.date === date)) {
      this.selectDay(date);
      return;
    }
    input.value = this.day()?.date ?? '';
    const range = `Choose a date between today and ${this.dayHeading(this.lastDate())}.`;
    this.dateError.set(
      date < this.firstDate()
        ? `${this.dayHeading(date)} has already passed. ${range}`
        : `There’s no live forecast for ${this.dayHeading(date)} yet. ${range}`,
    );
  }

  protected dayName(date: string): string {
    return dayLabel(date, this.today());
  }

  protected dayHeading(date: string): string {
    return dayHeading(date, this.today());
  }

  protected dayAriaLabel(day: DailyWeather): string {
    const rain =
      day.precipitationProbability === null
        ? ''
        : `, ${day.precipitationProbability}% chance of rain`;
    return (
      `${this.dayHeading(day.date)}: ${day.summary}, high ${Math.round(day.maxTemperatureC)}°, ` +
      `low ${Math.round(day.minTemperatureC)}°${rain}`
    );
  }

  protected reload(): void {
    this.reload$.next();
  }
}
