import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { AttractionSummary } from '../../../core/models/attraction.model';
import { ToastService } from '../../../core/services/toast.service';
import { TripPlanService } from '../../../core/services/trip-plan.service';
import { Icon } from '../icon/icon';

/**
 * Adds an attraction to My Plan, or removes it again (with undo). Shows a confirmation toast
 * and never creates duplicate stops.
 */
@Component({
  selector: 'app-add-to-plan-button',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './add-to-plan-button.scss',
  template: `
    <button
      type="button"
      class="btn plan-btn"
      [class.btn--primary]="!inPlan()"
      [class.plan-btn--added]="inPlan() && variant() === 'toggle'"
      [class.btn--danger]="inPlan() && variant() === 'explicit'"
      [class.btn--sm]="size() === 'sm'"
      [class.btn--lg]="size() === 'lg'"
      [class.btn--block]="block()"
      (click)="toggle()"
    >
      @if (inPlan() && variant() === 'explicit') {
        <app-icon name="trash" [size]="iconSize()" />
        <span>Remove from My Plan</span>
        <span class="visually-hidden">: {{ attraction().name }}</span>
      } @else if (inPlan()) {
        <span class="plan-btn__state" aria-hidden="true">
          <app-icon name="check" [size]="iconSize()" /> Added to My Plan
        </span>
        <span class="plan-btn__hover" aria-hidden="true">
          <app-icon name="x" [size]="iconSize()" /> Remove
        </span>
        <span class="visually-hidden"
          >Added to My Plan. Remove {{ attraction().name }} from My Plan</span
        >
      } @else {
        <app-icon name="plus" [size]="iconSize()" />
        <span>Add to My Plan</span>
        <span class="visually-hidden">: {{ attraction().name }}</span>
      }
    </button>
  `,
})
export class AddToPlanButton {
  readonly attraction = input.required<AttractionSummary>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly block = input(false);
  /** `toggle`: compact "Added" state (cards). `explicit`: a labelled remove action (details). */
  readonly variant = input<'toggle' | 'explicit'>('toggle');

  private readonly plan = inject(TripPlanService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly inPlan = computed(() => this.plan.isInPlan(this.attraction().id));
  protected readonly iconSize = computed(() => (this.size() === 'sm' ? 16 : 18));

  protected toggle(): void {
    const attraction = this.attraction();

    if (this.inPlan()) {
      const index = this.plan.remove(attraction.id);
      this.toast.show(`${attraction.name} was removed from My Plan.`, {
        tone: 'info',
        action: { label: 'Undo', run: () => this.plan.insertAt(attraction, index) },
      });
      return;
    }

    switch (this.plan.add(attraction)) {
      case 'added':
        this.toast.show(
          `${attraction.name} added as stop ${this.plan.stopNumberOf(attraction.id)} in My Plan.`,
          { action: { label: 'View plan', run: () => this.router.navigateByUrl('/my-plan') } },
        );
        break;
      case 'duplicate':
        this.toast.show(`${attraction.name} is already in My Plan.`, { tone: 'info' });
        break;
      case 'full':
        this.toast.show(
          `My Plan can hold up to ${this.plan.maxStops} stops. Remove one to add ${attraction.name}.`,
          { tone: 'error' },
        );
        break;
    }
  }
}
