import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { categoryIcon } from '../../../core/models/attraction.model';
import { AdminDashboardService } from '../../../core/services/admin-dashboard.service';
import { toLoadState } from '../../../core/utils/load-state';
import { Icon } from '../../../shared/components/icon/icon';
import { ErrorState } from '../../../shared/components/state/error-state';
import { LoadingState } from '../../../shared/components/state/loading-state';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, DatePipe, Icon, ErrorState, LoadingState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './admin-dashboard.scss',
  templateUrl: './admin-dashboard.html',
})
export default class AdminDashboard {
  protected readonly state = toLoadState(
    inject(AdminDashboardService).get(),
    'Dashboard data couldn’t be loaded.',
  );

  protected readonly stats = computed(() => {
    const state = this.state();
    if (state.status !== 'ready') {
      return null;
    }
    const data = state.data;
    const byCategory = data.byCategory.map((c) => ({ ...c, icon: categoryIcon(c.slug) }));
    return { ...data, byCategory, max: Math.max(1, ...byCategory.map((c) => c.count)) };
  });
}
