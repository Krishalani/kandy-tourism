import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Attraction } from '../../../core/models/attraction.model';
import { AttractionService } from '../../../core/services/attraction.service';
import {
  GeolocationError,
  GeolocationFailure,
  GeolocationService,
} from '../../../core/services/geolocation.service';
import { TripPlanService } from '../../../core/services/trip-plan.service';
import { Icon } from '../../../shared/components/icon/icon';

type Choice = `preset:${string}` | 'attraction' | 'custom' | 'current';

const GEO_MESSAGES: Record<GeolocationFailure, string> = {
  unsupported: 'Your browser can’t share a location. Choose another starting point instead.',
  denied:
    'Location access was not allowed. That’s fine — choose another starting point, or allow access in your browser settings and try again.',
  unavailable: 'We couldn’t determine your location. Please choose another starting point.',
  timeout: 'Finding your location took too long. Please try again or choose another start.',
};

@Component({
  selector: 'app-start-point-picker',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './start-point-picker.scss',
  templateUrl: './start-point-picker.html',
})
export class StartPointPicker {
  protected readonly plan = inject(TripPlanService);
  private readonly geolocation = inject(GeolocationService);

  protected readonly attractions = toSignal(
    inject(AttractionService)
      .getAttractions()
      .pipe(map((list) => [...list].sort((a, b) => a.name.localeCompare(b.name)))),
    { initialValue: [] as Attraction[] },
  );

  protected readonly expanded = signal(false);

  protected readonly choice = linkedSignal<Choice>(() => {
    const start = this.plan.start();
    return start.type === 'preset' ? `preset:${start.presetId}` : start.type;
  });

  protected readonly selectedAttractionId = linkedSignal(() => {
    const start = this.plan.start();
    return start.type === 'attraction' ? start.attractionId : '';
  });

  protected readonly customText = linkedSignal(() => {
    const start = this.plan.start();
    return start.type === 'custom' ? start.query : '';
  });

  protected readonly geoState = signal<'idle' | 'requesting' | 'error'>('idle');
  protected readonly geoMessage = signal('');

  /** True when the chosen attraction start is also one of the itinerary stops. */
  protected readonly startIsAlsoStop = computed(() => {
    const start = this.plan.start();
    return start.type === 'attraction' && this.plan.isInPlan(start.attractionId);
  });

  protected readonly customStartActive = computed(() => this.plan.start().type === 'custom');

  protected select(choice: Choice): void {
    this.choice.set(choice);
    if (choice.startsWith('preset:')) {
      this.plan.setStart({ type: 'preset', presetId: choice.slice('preset:'.length) });
    } else if (choice === 'attraction' && this.selectedAttractionId()) {
      this.plan.setStart({ type: 'attraction', attractionId: this.selectedAttractionId() });
    }
  }

  protected chooseAttraction(id: string): void {
    this.selectedAttractionId.set(id);
    if (id) {
      this.plan.setStart({ type: 'attraction', attractionId: id });
    }
  }

  protected applyCustom(event: Event): void {
    event.preventDefault();
    const query = this.customText().trim().slice(0, 200);
    if (query) {
      this.plan.setStart({ type: 'custom', query });
    }
  }

  protected async useCurrentLocation(): Promise<void> {
    this.geoState.set('requesting');
    this.geoMessage.set('');
    try {
      const point = await this.geolocation.requestCurrentPosition();
      this.plan.setStart({ type: 'current', ...point });
      this.geoState.set('idle');
    } catch (error) {
      const reason = error instanceof GeolocationError ? error.reason : 'unavailable';
      this.geoState.set('error');
      this.geoMessage.set(GEO_MESSAGES[reason]);
    }
  }
}
