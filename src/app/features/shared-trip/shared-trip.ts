import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ItineraryPdfService } from '../../core/pdf/itinerary-pdf.service';
import { ItineraryApiService } from '../../core/services/itinerary-api.service';
import { ToastService } from '../../core/services/toast.service';
import { WeatherService } from '../../core/services/weather.service';
import { toLoadState } from '../../core/utils/load-state';
import {
  buildGoogleMapsDirectionsUrl,
  numberStops,
  summarizeItinerary,
  toResolvedStart,
} from '../../core/utils/route-planner';
import { formatTripDate, relativeTripDay, sriLankaToday } from '../../core/utils/trip-date';
import { weatherIcon } from '../../core/utils/weather';
import { Icon } from '../../shared/components/icon/icon';
import { ItineraryTimeline } from '../../shared/components/itinerary-timeline/itinerary-timeline';
import { ErrorState } from '../../shared/components/state/error-state';
import { DurationPipe } from '../../shared/pipes/duration.pipe';

/** A plan someone shared with a read-only link. Nothing here can change the plan. */
@Component({
  selector: 'app-shared-trip',
  imports: [RouterLink, Icon, ItineraryTimeline, ErrorState, DurationPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './shared-trip.scss',
  templateUrl: './shared-trip.html',
})
export default class SharedTrip {
  private readonly pdf = inject(ItineraryPdfService);
  private readonly toast = inject(ToastService);
  private readonly today = sriLankaToday();

  protected readonly state = toLoadState(
    inject(ItineraryApiService).getShared(
      inject(ActivatedRoute).snapshot.paramMap.get('shareId') ?? '',
    ),
    'This shared plan couldn’t be loaded.',
  );

  protected readonly trip = computed(() => {
    const state = this.state();
    if (state.status !== 'ready') {
      return null;
    }
    const start = toResolvedStart(state.data.start);
    const stops = numberStops(state.data.stops.map((s) => s.attraction));
    const tripDate = state.data.tripDate ?? null;
    return {
      start,
      stops,
      tripDate,
      dateLabel: tripDate
        ? `${formatTripDate(tripDate)} (${relativeTripDay(tripDate, this.today)})`
        : null,
      summary: summarizeItinerary(stops),
      directionsUrl: buildGoogleMapsDirectionsUrl(start, stops),
    };
  });

  private readonly forecast = toSignal(
    inject(WeatherService)
      .getForecast()
      .pipe(catchError(() => of(null))),
  );

  protected readonly tripWeather = computed(() => {
    const date = this.trip()?.tripDate;
    return (date && this.forecast()?.days.find((d) => d.date === date)) || null;
  });

  protected readonly weatherIcon = weatherIcon;
  protected readonly downloadingPdf = signal(false);

  protected async downloadPdf(): Promise<void> {
    const trip = this.trip();
    if (!trip) {
      return;
    }
    this.downloadingPdf.set(true);
    try {
      await this.pdf.download({ start: trip.start, stops: trip.stops, tripDate: trip.tripDate });
      this.toast.show('The itinerary PDF has been downloaded.');
    } catch {
      this.toast.show('We couldn’t create the PDF. Please try again.', { tone: 'error' });
    } finally {
      this.downloadingPdf.set(false);
    }
  }
}
