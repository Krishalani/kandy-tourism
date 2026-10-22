import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { AttractionSummary } from '../../../core/models/attraction.model';
import { StartPoint, StartPreset } from '../../../core/models/trip-plan.model';
import { AttractionService } from '../../../core/services/attraction.service';
import { CatalogService } from '../../../core/services/catalog.service';
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

  protected readonly presets = toSignal(
    inject(CatalogService)
      .getStartPoints()
      .pipe(catchError(() => of<StartPreset[]>([]))),
    { initialValue: [] as StartPreset[] },
  );

  protected readonly attractions = toSignal(
    inject(AttractionService)
      .search({ sort: 'name', pageSize: 100 })
      .pipe(
        map((result) => result.items),
        catchError(() => of<AttractionSummary[]>([])),
      ),
    { initialValue: [] as AttractionSummary[] },
  );

  protected readonly expanded = signal(false);
  protected readonly saving = signal(false);

  protected readonly choice = linkedSignal<Choice>(() => this.currentChoice());

  protected readonly selectedAttractionId = linkedSignal(() => {
    const start = this.plan.start();
    return start?.type === 'attraction' ? start.attractionId : 0;
  });

  protected readonly customText = linkedSignal(() => {
    const start = this.plan.start();
    return start?.type === 'custom' ? start.query : '';
  });

  protected readonly geoState = signal<'idle' | 'requesting' | 'error'>('idle');
  protected readonly geoMessage = signal('');

  /** True when the chosen attraction start is also one of the itinerary stops. */
  protected readonly startIsAlsoStop = computed(() => {
    const start = this.plan.start();
    return start?.type === 'attraction' && this.plan.isInPlan(start.attractionId);
  });

  protected readonly customStartActive = computed(() => this.plan.start()?.type === 'custom');

  protected select(choice: Choice): void {
    this.choice.set(choice);
    if (choice.startsWith('preset:')) {
      void this.apply({ type: 'preset', presetId: choice.slice('preset:'.length) });
    } else if (choice === 'attraction' && this.selectedAttractionId()) {
      void this.apply({ type: 'attraction', attractionId: this.selectedAttractionId() });
    }
  }

  protected chooseAttraction(value: string): void {
    const id = Number(value);
    this.selectedAttractionId.set(id);
    if (id) {
      void this.apply({ type: 'attraction', attractionId: id });
    }
  }

  protected applyCustom(event: Event): void {
    event.preventDefault();
    const query = this.customText().trim().slice(0, 200);
    if (query) {
      void this.apply({ type: 'custom', query });
    }
  }

  protected async useCurrentLocation(): Promise<void> {
    this.geoState.set('requesting');
    this.geoMessage.set('');
    try {
      const point = await this.geolocation.requestCurrentPosition();
      await this.plan.setStart({ type: 'current', ...point });
      this.geoState.set('idle');
    } catch (error) {
      const reason = error instanceof GeolocationError ? error.reason : 'unavailable';
      this.geoState.set('error');
      this.geoMessage.set(GEO_MESSAGES[reason]);
    }
  }

  /** On failure the plan keeps its saved start and the picker snaps back to it. */
  private async apply(start: StartPoint): Promise<void> {
    this.saving.set(true);
    const saved = await this.plan.setStart(start);
    this.saving.set(false);
    if (!saved) {
      this.choice.set(this.currentChoice());
    }
  }

  private currentChoice(): Choice {
    const start = this.plan.start();
    return start?.type === 'preset' ? `preset:${start.presetId}` : (start?.type ?? 'custom');
  }
}
