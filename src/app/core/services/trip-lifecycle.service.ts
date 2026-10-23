import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { formatTripDate } from '../utils/trip-date';
import { ConfirmService } from './confirm.service';
import { ToastService } from './toast.service';
import { TripPlanService } from './trip-plan.service';

/** The confirm → change → start-again steps of a trip, with their confirmation dialogs and messages. */
@Injectable({ providedIn: 'root' })
export class TripLifecycleService {
  private readonly plan = inject(TripPlanService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  async confirmTrip(): Promise<boolean> {
    const date = this.plan.tripDate();
    const confirmed = await this.confirm.confirm({
      title: 'Confirm your trip?',
      message:
        `Your plan${date ? ` for ${formatTripDate(date)}` : ''} will be locked so nothing changes by ` +
        'accident. You can still choose “Change plan” later if you need to.',
      confirmLabel: 'Confirm my trip',
      cancelLabel: 'Not yet',
    });
    if (!confirmed || !(await this.plan.confirmTrip())) {
      return false;
    }
    this.toast.show('Your trip is confirmed. Have a wonderful day in Kandy!');
    return true;
  }

  /** Moves a confirmed trip back to planning and opens My Plan to edit it. */
  async changePlan(): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Change your plan?',
      message:
        'Your trip goes back to planning so you can edit the stops, start and date. ' +
        'Confirm it again when you’re done.',
      confirmLabel: 'Change plan',
      cancelLabel: 'Keep it confirmed',
    });
    if (confirmed && (await this.plan.reopenTrip())) {
      this.toast.show('Your plan is open for changes again.', { tone: 'info' });
      void this.router.navigateByUrl('/my-plan');
    }
  }

  /**
   * Starts a fresh plan. A completed trip and its feedback are kept; an unfinished plan's share
   * link is turned off first so it doesn't stay public.
   */
  async startNewPlan(): Promise<void> {
    const completed = this.plan.status() === 'completed';
    const confirmed = await this.confirm.confirm({
      title: 'Plan another day?',
      message: completed
        ? 'Your completed trip and feedback stay saved. You’ll start with an empty plan.'
        : `This leaves your current plan of ${this.plan.count()} ${this.plan.count() === 1 ? 'stop' : 'stops'}` +
          `${this.plan.shareId() ? ' and turns off its share link' : ''}. ` +
          'Download the PDF first if you’d like to keep a copy.',
      confirmLabel: 'Start a new plan',
      cancelLabel: completed ? 'Not now' : 'Keep this plan',
      tone: completed ? 'default' : 'danger',
    });
    if (!confirmed) {
      return;
    }
    if (!completed && this.plan.shareId()) {
      await this.plan.disableSharing();
    }
    await this.plan.startNewPlan();
    this.toast.show('Your new plan is ready. Add the places you’d like to visit.', {
      tone: 'info',
    });
    void this.router.navigateByUrl('/explore');
  }
}
