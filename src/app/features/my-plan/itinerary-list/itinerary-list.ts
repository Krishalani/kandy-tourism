import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDragPlaceholder,
  CdkDropList,
} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ItineraryStop } from '../../../core/models/trip-plan.model';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { TripPlanService } from '../../../core/services/trip-plan.service';
import { removeStopConfirmation } from '../../../core/utils/plan-confirmations';
import { Icon } from '../../../shared/components/icon/icon';
import { ImgFallbackDirective } from '../../../shared/directives/img-fallback.directive';
import { DurationPipe } from '../../../shared/pipes/duration.pipe';

/**
 * Ordered, editable list of stops. Supports drag-and-drop (mouse and touch) and
 * move up / move down buttons for keyboard and screen-reader users.
 */
@Component({
  selector: 'app-itinerary-list',
  imports: [
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
    RouterLink,
    Icon,
    ImgFallbackDirective,
    DurationPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './itinerary-list.scss',
  templateUrl: './itinerary-list.html',
})
export class ItineraryList {
  protected readonly plan = inject(TripPlanService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Polite announcement for assistive technology after reordering or removing. */
  protected readonly announcement = signal('');

  protected drop(event: CdkDragDrop<ItineraryStop[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    const stop = this.plan.stops()[event.previousIndex];
    this.plan.move(event.previousIndex, event.currentIndex);
    this.announceMove(stop.attraction.name, event.currentIndex);
  }

  protected moveUp(stop: ItineraryStop): void {
    this.moveBy(stop, -1);
  }

  protected moveDown(stop: ItineraryStop): void {
    this.moveBy(stop, 1);
  }

  protected async remove(stop: ItineraryStop): Promise<void> {
    const attraction = stop.attraction;
    const confirmed = await this.confirm.confirm(
      removeStopConfirmation(attraction, stop.order, this.plan.count()),
    );
    if (!confirmed || !this.plan.isInPlan(attraction.id)) {
      return;
    }
    const index = this.plan.remove(attraction.id);
    this.announcement.set(`${attraction.name} removed. ${this.plan.count()} stops remaining.`);
    this.toast.show(`${attraction.name} was removed from My Plan.`, {
      tone: 'info',
      action: { label: 'Undo', run: () => this.plan.insertAt(attraction, index) },
    });

    const next = this.plan.stops()[Math.min(index, this.plan.count() - 1)];
    afterNextRender(
      () => {
        const target = next
          ? this.query(`[data-stop-id="${next.attraction.id}"] .stop__remove`)
          : this.query('.itinerary-empty-focus');
        target?.focus();
      },
      { injector: this.injector },
    );
  }

  private moveBy(stop: ItineraryStop, delta: -1 | 1): void {
    const from = stop.order - 1;
    const to = from + delta;
    if (to < 0 || to >= this.plan.count()) {
      return;
    }
    this.plan.move(from, to);
    this.announceMove(stop.attraction.name, to);

    // Keep focus on the moved stop so repeated presses keep moving it.
    const id = stop.attraction.id;
    afterNextRender(
      () => {
        const item = `[data-stop-id="${id}"]`;
        const preferred = this.query<HTMLButtonElement>(
          `${item} ${delta < 0 ? '.stop__up' : '.stop__down'}`,
        );
        const fallback = this.query<HTMLButtonElement>(
          `${item} ${delta < 0 ? '.stop__down' : '.stop__up'}`,
        );
        (preferred && !preferred.disabled ? preferred : fallback)?.focus();
      },
      { injector: this.injector },
    );
  }

  private announceMove(name: string, toIndex: number): void {
    this.announcement.set(`${name} moved to stop ${toIndex + 1} of ${this.plan.count()}.`);
  }

  private query<T extends HTMLElement = HTMLElement>(selector: string): T | null {
    return this.host.nativeElement.querySelector<T>(selector);
  }
}
