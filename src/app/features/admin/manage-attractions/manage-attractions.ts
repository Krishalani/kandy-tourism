import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ATTRACTION_CATEGORIES,
  Attraction,
  AttractionCategory,
} from '../../../core/models/attraction.model';
import { AttractionService } from '../../../core/services/attraction.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { TripPlanService } from '../../../core/services/trip-plan.service';
import { filterAttractions } from '../../../core/utils/attraction-filter';
import { toLoadState } from '../../../core/utils/load-state';
import { Icon } from '../../../shared/components/icon/icon';
import { EmptyState } from '../../../shared/components/state/empty-state';
import { ErrorState } from '../../../shared/components/state/error-state';
import { ImgFallbackDirective } from '../../../shared/directives/img-fallback.directive';
import { CategoryPipe } from '../../../shared/pipes/category.pipe';
import { DurationPipe } from '../../../shared/pipes/duration.pipe';

@Component({
  selector: 'app-manage-attractions',
  imports: [
    RouterLink,
    Icon,
    EmptyState,
    ErrorState,
    ImgFallbackDirective,
    CategoryPipe,
    DurationPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './manage-attractions.scss',
  templateUrl: './manage-attractions.html',
})
export default class ManageAttractions {
  private readonly attractionService = inject(AttractionService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly plan = inject(TripPlanService);

  protected readonly categories = ATTRACTION_CATEGORIES;
  protected readonly query = signal('');
  protected readonly category = signal<AttractionCategory | 'all'>('all');

  protected readonly state = toLoadState(this.attractionService.getAttractions());

  protected readonly rows = computed(() => {
    const state = this.state();
    if (state.status !== 'ready') {
      return [];
    }
    return filterAttractions(state.data, {
      query: this.query(),
      category: this.category(),
      sort: 'name',
    });
  });

  protected async delete(attraction: Attraction): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: `Delete “${attraction.name}”?`,
      message:
        'It will be removed from the demo data in this browser, and from My Plan if it was added there. This is not saved to any server.',
      confirmLabel: 'Delete attraction',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }
    this.attractionService.deleteAttraction(attraction.id).subscribe({
      next: () => {
        this.plan.remove(attraction.id);
        this.toast.show(`${attraction.name} was deleted from the demo data.`, { tone: 'info' });
      },
      error: () => this.toast.show('That attraction could not be deleted.', { tone: 'error' }),
    });
  }
}
