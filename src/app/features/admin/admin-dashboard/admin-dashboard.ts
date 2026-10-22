import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ATTRACTION_CATEGORIES } from '../../../core/models/attraction.model';
import { AttractionService } from '../../../core/services/attraction.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { MockAttractionService } from '../../../core/services/mock-attraction.service';
import { ToastService } from '../../../core/services/toast.service';
import { toLoadState } from '../../../core/utils/load-state';
import { Icon } from '../../../shared/components/icon/icon';
import { ErrorState } from '../../../shared/components/state/error-state';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, Icon, ErrorState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './admin-dashboard.scss',
  templateUrl: './admin-dashboard.html',
})
export default class AdminDashboard {
  // Demo-only reset lives on the mock service; a real API would not offer it.
  protected readonly demoData = inject(MockAttractionService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly state = toLoadState(inject(AttractionService).getAttractions());

  protected readonly stats = computed(() => {
    const state = this.state();
    if (state.status !== 'ready') {
      return null;
    }
    const list = state.data;
    const byCategory = ATTRACTION_CATEGORIES.map((category) => ({
      category,
      count: list.filter((a) => a.category === category.id).length,
    }));
    return {
      total: list.length,
      featured: list.filter((a) => a.featured).length,
      categoriesInUse: byCategory.filter((c) => c.count > 0).length,
      approximateCoordinates: list.filter((a) => a.coordinatesApproximate).length,
      byCategory,
      max: Math.max(1, ...byCategory.map((c) => c.count)),
    };
  });

  protected async resetDemo(): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Reset demo data?',
      message:
        'This discards every change made in the admin demo on this browser and restores the original attraction list.',
      confirmLabel: 'Reset data',
      tone: 'danger',
    });
    if (confirmed) {
      this.demoData.resetDemoData();
      this.toast.show('Demo data restored to the original attractions.', { tone: 'info' });
    }
  }
}
