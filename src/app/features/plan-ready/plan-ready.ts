import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ItineraryPdfService } from '../../core/pdf/itinerary-pdf.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { TripPlanService } from '../../core/services/trip-plan.service';
import { WeatherService } from '../../core/services/weather.service';
import { formatTripDate, sriLankaToday } from '../../core/utils/trip-date';
import { planningAdvice } from '../../core/utils/weather';
import { Icon } from '../../shared/components/icon/icon';
import { ItineraryTimeline } from '../../shared/components/itinerary-timeline/itinerary-timeline';
import { EmptyState } from '../../shared/components/state/empty-state';
import { TripDatePicker } from '../../shared/components/trip-date-picker/trip-date-picker';
import { isPlanReady, planChecklist } from './plan-checklist';

/** The end of the planning journey: a final check, then the PDF, directions and a share link. */
@Component({
  selector: 'app-plan-ready',
  imports: [RouterLink, Icon, EmptyState, TripDatePicker, ItineraryTimeline],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './plan-ready.scss',
  templateUrl: './plan-ready.html',
})
export default class PlanReady {
  protected readonly plan = inject(TripPlanService);
  private readonly pdf = inject(ItineraryPdfService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly origin = inject(DOCUMENT).location.origin;

  private readonly today = sriLankaToday();

  /** `undefined` while loading, `null` if the forecast couldn't be loaded. */
  private readonly forecast = toSignal(
    inject(WeatherService)
      .getForecast()
      .pipe(catchError(() => of(null))),
  );

  private readonly tripDay = computed(() => {
    const date = this.plan.tripDate();
    return (date && this.forecast()?.days.find((d) => d.date === date)) || null;
  });

  protected readonly checklist = computed(() => {
    const tripDay = this.tripDay();
    const forecast = this.forecast();
    const isToday = tripDay?.date === forecast?.current.time.slice(0, 10);
    return planChecklist({
      today: this.today,
      stopCount: this.plan.count(),
      startLabel: this.plan.resolvedStart().label,
      tripDate: this.plan.tripDate(),
      totalVisitMinutes: this.plan.summary().totalVisitMinutes,
      forecastLoaded: forecast === undefined ? undefined : forecast !== null,
      tripDay,
      advice: tripDay
        ? planningAdvice(
            tripDay,
            this.plan.stops().map((s) => s.attraction),
            isToday ? Number(forecast!.current.time.slice(11, 13)) : undefined,
          )
        : null,
    });
  });

  protected readonly ready = computed(() => isPlanReady(this.checklist()));
  /** e.g. "4 stops from Kandy City Centre on Sunday 25 October 2026." */
  protected readonly overview = computed(() => {
    const count = this.plan.count();
    const date = this.plan.tripDate();
    return (
      `${count} ${count === 1 ? 'stop' : 'stops'} from ${this.plan.resolvedStart().label}` +
      `${date ? ` on ${formatTripDate(date)}` : ''}.`
    );
  });
  protected readonly shareUrl = computed(() => {
    const id = this.plan.shareId();
    return id ? `${this.origin}/trip/${id}` : null;
  });

  protected readonly downloadingPdf = signal(false);
  protected readonly sharing = signal(false);

  protected async downloadPdf(): Promise<void> {
    this.downloadingPdf.set(true);
    try {
      const { missingDetails } = await this.pdf.download({
        start: this.plan.resolvedStart(),
        stops: this.plan.stops(),
        tripDate: this.plan.tripDate(),
      });
      this.toast.show(
        missingDetails
          ? 'Your PDF has been downloaded, but some stop details couldn’t be loaded.'
          : 'Your itinerary PDF has been downloaded.',
        { tone: missingDetails ? 'info' : 'success' },
      );
    } catch {
      this.toast.show('We couldn’t create your itinerary PDF. Please try again.', {
        tone: 'error',
      });
    } finally {
      this.downloadingPdf.set(false);
    }
  }

  protected async createShareLink(): Promise<void> {
    this.sharing.set(true);
    if (await this.plan.enableSharing()) {
      this.toast.show('Share link created. Anyone with the link can view your plan.');
    }
    this.sharing.set(false);
  }

  protected async copyShareLink(): Promise<void> {
    const url = this.shareUrl();
    if (!url) {
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      this.toast.show('Share link copied to your clipboard.');
    } catch {
      this.toast.show('Copying isn’t available here. Select the link and copy it instead.', {
        tone: 'error',
      });
    }
  }

  protected async stopSharing(): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Stop sharing this plan?',
      message: 'The current link will stop working for everyone who has it.',
      confirmLabel: 'Stop sharing',
      cancelLabel: 'Keep sharing',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }
    this.sharing.set(true);
    if (await this.plan.disableSharing()) {
      this.toast.show('Sharing is off. The old link no longer works.', { tone: 'info' });
    }
    this.sharing.set(false);
  }

  /** Clears this plan (stops, date and share link) so the tourist can plan another day. */
  protected async startNewPlan(): Promise<void> {
    const count = this.plan.count();
    const confirmed = await this.confirm.confirm({
      title: 'Start a new plan?',
      message:
        `This clears the ${count} ${count === 1 ? 'stop' : 'stops'} in your current plan` +
        `${this.plan.shareId() ? ' and turns off its share link' : ''}. ` +
        'Download the PDF first if you’d like to keep a copy.',
      confirmLabel: 'Start a new plan',
      cancelLabel: 'Keep this plan',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }
    if (this.plan.shareId()) {
      void this.plan.disableSharing();
    }
    if (this.plan.tripDate()) {
      void this.plan.setTripDate(null);
    }
    this.plan.clear();
    this.toast.show('Your previous plan has been cleared. Add places for your next day.', {
      tone: 'info',
    });
    void this.router.navigateByUrl('/explore');
  }
}
