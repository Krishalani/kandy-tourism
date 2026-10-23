import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AttractionService } from '../../core/services/attraction.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { TripPlanService } from '../../core/services/trip-plan.service';
import { suggestShorterOrder, totalStraightLineKm } from '../../core/utils/route-planner';
import { Icon } from '../../shared/components/icon/icon';
import { EmptyState } from '../../shared/components/state/empty-state';
import { ErrorState } from '../../shared/components/state/error-state';
import { ItineraryList } from './itinerary-list/itinerary-list';
import { RouteMap } from './route-map/route-map';
import { StartPointPicker } from './start-point-picker/start-point-picker';
import { TripSummary } from './trip-summary/trip-summary';

@Component({
  selector: 'app-my-plan',
  imports: [
    RouterLink,
    Icon,
    EmptyState,
    ErrorState,
    StartPointPicker,
    ItineraryList,
    RouteMap,
    TripSummary,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './my-plan.scss',
  templateUrl: './my-plan.html',
})
export default class MyPlan {
  protected readonly plan = inject(TripPlanService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly attractions = inject(AttractionService);

  private readonly mapSection = viewChild<ElementRef<HTMLElement>>('mapSection');
  protected readonly addingSample = signal(false);
  protected readonly downloadingPdf = signal(false);

  protected async clearPlan(): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Clear your whole plan?',
      message: `This removes all ${this.plan.count()} stops from My Plan. This can’t be undone.`,
      confirmLabel: 'Clear plan',
      cancelLabel: 'Keep my plan',
      tone: 'danger',
    });
    if (confirmed) {
      this.plan.clear();
      this.toast.show('Your plan has been cleared.', { tone: 'info' });
    }
  }

  /** Optional helper. It only proposes an order; nothing changes unless the tourist accepts. */
  protected async suggestOrder(): Promise<void> {
    const start = this.plan.resolvedStart().point;
    const stops = this.plan.stops();
    const suggestion = suggestShorterOrder(start, stops);
    const currentKm = totalStraightLineKm(
      start,
      stops.map((s) => s.attraction),
    );
    const suggestedKm = totalStraightLineKm(start, suggestion);

    // Only propose a change that is meaningfully shorter (at least 100 m in straight-line terms).
    if (suggestedKm > currentKm - 0.1) {
      this.toast.show('Your current order is already as compact as our suggestion would be.', {
        tone: 'info',
      });
      return;
    }

    const confirmed = await this.confirm.confirm({
      title: 'Use a suggested order?',
      message:
        `This would reorder your stops by always visiting the nearest next place (straight-line ` +
        `distance ${currentKm.toFixed(1)} km → ${suggestedKm.toFixed(1)} km). It ignores roads, ` +
        `traffic and opening hours, so check it suits you. Your current order stays unless you accept.`,
      detailsLabel: 'Suggested order',
      details: suggestion.map((a) => a.name),
      confirmLabel: 'Use this order',
      cancelLabel: 'Keep my order',
    });

    if (confirmed) {
      const previous = stops.map((s) => s.attraction.id);
      this.plan.setOrder(suggestion.map((a) => a.id));
      this.toast.show('Your stops have been reordered.', {
        action: { label: 'Undo', run: () => this.plan.setOrder(previous) },
      });
    }
  }

  protected async addSampleDay(): Promise<void> {
    this.addingSample.set(true);
    const added = await this.plan.addSampleDay();
    this.addingSample.set(false);
    if (added > 0) {
      this.toast.show(`Added a sample day with ${added} stops. Rearrange them however you like.`);
    }
  }

  protected retryLoad(): void {
    void this.plan.restore();
  }

  protected async downloadPdf(): Promise<void> {
    if (this.downloadingPdf()) {
      return;
    }
    this.downloadingPdf.set(true);
    try {
      const stops = this.plan.stops();
      const [pdf, details] = await Promise.all([
        import('./itinerary-pdf'),
        Promise.all(
          stops.map((s) =>
            firstValueFrom(this.attractions.getBySlug(s.attraction.slug)).catch(() => null),
          ),
        ),
      ]);
      const generatedAt = new Date();
      pdf
        .createItineraryPdf({
          start: this.plan.resolvedStart(),
          stops,
          details,
          summary: this.plan.summary(),
          directionsUrl: this.plan.directionsUrl(),
          generatedAt,
        })
        .save(pdf.itineraryPdfFileName(generatedAt));

      if (details.some((d) => d === null)) {
        this.toast.show(
          'Your itinerary PDF has been downloaded, but some stop details couldn’t be loaded.',
          { tone: 'info' },
        );
      } else {
        this.toast.show('Your itinerary PDF has been downloaded.');
      }
    } catch {
      this.toast.show('We couldn’t create your itinerary PDF. Please try again.', {
        tone: 'error',
      });
    } finally {
      this.downloadingPdf.set(false);
    }
  }

  protected showMap(): void {
    const section = this.mapSection()?.nativeElement;
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    section?.focus({ preventScroll: true });
  }
}
