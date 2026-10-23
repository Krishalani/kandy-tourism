import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import { DailyWeather } from '../../../core/models/weather.model';
import {
  WeatherAdvice,
  formatClock,
  hoursToShow,
  isDaylight,
  uvLevel,
  weatherIcon,
} from '../../../core/utils/weather';
import { Icon } from '../../../shared/components/icon/icon';

/** One day of the forecast: planning advice, an hourly strip and sun/UV/rain facts. */
@Component({
  selector: 'app-weather-day',
  imports: [Icon, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './weather-day.scss',
  templateUrl: './weather-day.html',
})
export class WeatherDay {
  readonly day = input.required<DailyWeather>();
  readonly heading = input.required<string>();
  readonly advice = input<WeatherAdvice | null>(null);
  /** The current local hour when this day is today; earlier hours are hidden and it is marked "Now". */
  readonly currentHour = input<number | undefined>(undefined);

  protected readonly hours = computed(() => hoursToShow(this.day(), this.currentHour()));

  private readonly strip = viewChild<ElementRef<HTMLElement>>('strip');

  constructor() {
    // The strip is reused between days, so start each newly chosen day at its first hour.
    effect(() => {
      this.day();
      untracked(() => this.strip()?.nativeElement.scrollTo({ left: 0 }));
    });
  }

  protected readonly weatherIcon = weatherIcon;
  protected readonly formatClock = formatClock;
  protected readonly isDaylight = isDaylight;
  protected readonly uvLevel = uvLevel;
}
