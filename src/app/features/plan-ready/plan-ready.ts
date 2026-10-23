import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { CompleteTripRequest } from '../../core/models/trip-plan.model';
import { ItineraryPdfService } from '../../core/pdf/itinerary-pdf.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { TripLifecycleService } from '../../core/services/trip-lifecycle.service';
import { TripPlanService } from '../../core/services/trip-plan.service';
import { WeatherService } from '../../core/services/weather.service';
import { formatTripDate, relativeTripDay, sriLankaToday } from '../../core/utils/trip-date';
import { planningAdvice } from '../../core/utils/weather';
import { Icon } from '../../shared/components/icon/icon';
import { ItineraryTimeline } from '../../shared/components/itinerary-timeline/itinerary-timeline';
import { RATING_LABELS, StarDisplay } from '../../shared/components/star-rating/star-rating';
import { EmptyState } from '../../shared/components/state/empty-state';
import { TripDatePicker } from '../../shared/components/trip-date-picker/trip-date-picker';
import { ChecklistStatus, isPlanReady, planChecklist } from './plan-checklist';
import { TripFeedbackForm } from './trip-feedback-form';

type StepState = 'done' | 'current' | 'todo';

/**
 * The end of the planning journey and the trip itself: a final check and confirmation, the PDF,
 * directions and share link, then feedback that completes the trip.
 */
@Component({
  selector: 'app-plan-ready',
  imports: [
    RouterLink,
    Icon,
    EmptyState,
    TripDatePicker,
    ItineraryTimeline,
    TripFeedbackForm,
    StarDisplay,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './plan-ready.scss',
  templateUrl: './plan-ready.html',
})
export default class PlanReady {
  protected readonly plan = inject(TripPlanService);
  protected readonly lifecycle = inject(TripLifecycleService);
  private readonly pdf = inject(ItineraryPdfService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
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
  protected readonly tripDateLabel = computed(() => {
    const date = this.plan.tripDate();
    return date ? formatTripDate(date) : '';
  });
  /** A confirmed trip can be completed from its trip day onwards. */
  protected readonly canComplete = computed(() => {
    const date = this.plan.tripDate();
    return this.plan.status() === 'confirmed' && date !== null && date <= this.today;
  });

  protected readonly steps = computed<{ label: string; state: StepState }[]>(() => {
    const status = this.plan.status();
    return [
      { label: 'Plan your day', state: status === 'planning' ? 'current' : 'done' },
      {
        label: 'Confirm your trip',
        state: status === 'planning' ? 'todo' : status === 'confirmed' ? 'current' : 'done',
      },
      { label: 'Rate & complete', state: status === 'completed' ? 'done' : 'todo' },
    ];
  });

  protected readonly eyebrow = computed(() => {
    switch (this.plan.status()) {
      case 'confirmed':
        return 'Trip confirmed';
      case 'completed':
        return 'Trip completed';
      default:
        return 'Finish planning';
    }
  });

  protected readonly heading = computed(() => {
    switch (this.plan.status()) {
      case 'confirmed':
        return this.canComplete() ? 'How was your day in Kandy?' : 'You’re all set!';
      case 'completed':
        return 'Thanks for travelling with us!';
      default:
        return this.ready() ? 'Your Kandy day is ready!' : 'Almost ready';
    }
  });

  /** e.g. "4 stops from Kandy City Centre on Sunday 25 October 2026." */
  protected readonly overview = computed(() => {
    const count = this.plan.count();
    const date = this.plan.tripDate();
    return (
      `${count} ${count === 1 ? 'stop' : 'stops'} from ${this.plan.resolvedStart().label}` +
      `${date ? ` on ${formatTripDate(date)}` : ''}.`
    );
  });

  protected readonly leadNote = computed(() => {
    const date = this.plan.tripDate();
    switch (this.plan.status()) {
      case 'confirmed':
        return this.canComplete()
          ? 'Rate your day below to complete your trip.'
          : `Your trip is ${date ? relativeTripDay(date, this.today) : 'coming up'}, and the plan is locked so nothing changes by accident.`;
      case 'completed':
        return 'Your feedback helps other visitors plan their day.';
      default:
        return 'Check the list below, then confirm your trip.';
    }
  });

  protected readonly shareUrl = computed(() => {
    const id = this.plan.shareId();
    return id ? `${this.origin}/trip/${id}` : null;
  });

  private readonly stopRatings = computed(
    () => new Map(this.plan.feedback()?.stopRatings.map((r) => [r.attractionId, r.rating]) ?? []),
  );

  protected readonly downloadingPdf = signal(false);
  protected readonly sharing = signal(false);
  protected readonly confirming = signal(false);
  protected readonly completing = signal(false);

  protected checkPrefix(status: ChecklistStatus): string {
    return { done: 'Done: ', todo: 'To do: ', warn: 'Check: ', info: '' }[status];
  }

  protected ratingLabel(rating: number): string {
    return `${rating} out of 5 · ${RATING_LABELS[rating - 1]}`;
  }

  protected stopRating(attractionId: number): number | undefined {
    return this.stopRatings().get(attractionId);
  }

  protected async confirmTrip(): Promise<void> {
    this.confirming.set(true);
    if (await this.lifecycle.confirmTrip()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    this.confirming.set(false);
  }

  protected async complete(request: CompleteTripRequest): Promise<void> {
    this.completing.set(true);
    if (await this.plan.completeTrip(request)) {
      this.toast.show('Thank you for your feedback! Your trip is complete.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    this.completing.set(false);
  }

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
}
