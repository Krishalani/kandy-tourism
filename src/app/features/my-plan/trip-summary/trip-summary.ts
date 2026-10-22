import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { TripPlanService } from '../../../core/services/trip-plan.service';
import { MOBILE_BROWSER_WAYPOINT_LIMIT } from '../../../core/utils/route-planner';
import { Icon } from '../../../shared/components/icon/icon';
import { DurationPipe } from '../../../shared/pipes/duration.pipe';

const FULL_DAY_MINUTES = 6 * 60;
const OVERLOADED_DAY_MINUTES = 8 * 60;

@Component({
  selector: 'app-trip-summary',
  imports: [Icon, DurationPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './trip-summary.scss',
  templateUrl: './trip-summary.html',
})
export class TripSummary {
  protected readonly plan = inject(TripPlanService);
  private readonly toast = inject(ToastService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly routeSequence = computed(() =>
    [this.plan.resolvedStart().label, ...this.plan.stops().map((s) => s.attraction.name)].join(
      ' → ',
    ),
  );

  protected readonly dayLoad = computed<'light' | 'full' | 'overloaded'>(() => {
    const minutes = this.plan.summary().totalVisitMinutes;
    if (minutes > OVERLOADED_DAY_MINUTES) {
      return 'overloaded';
    }
    return minutes > FULL_DAY_MINUTES ? 'full' : 'light';
  });

  /** Waypoints = every stop except the final destination. */
  protected readonly exceedsMobileWaypoints = computed(
    () => this.plan.count() - 1 > MOBILE_BROWSER_WAYPOINT_LIMIT,
  );

  protected async copyLink(): Promise<void> {
    const url = this.plan.directionsUrl();
    if (!url || !this.isBrowser) {
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      this.toast.show('Directions link copied to your clipboard.');
    } catch {
      this.toast.show('Copying isn’t available in this browser. Use the Open button instead.', {
        tone: 'error',
      });
    }
  }
}
