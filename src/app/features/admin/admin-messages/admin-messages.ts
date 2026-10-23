import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { debounceTime, switchMap } from 'rxjs';
import { PagedResult } from '../../../core/api/api';
import { ContactStatusFilter, ContactSummary } from '../../../core/models/contact.model';
import { ContactService } from '../../../core/services/contact.service';
import { LoadState, withLoadState } from '../../../core/utils/load-state';
import { Icon } from '../../../shared/components/icon/icon';
import { EmptyState } from '../../../shared/components/state/empty-state';
import { ErrorState } from '../../../shared/components/state/error-state';

const PAGE_SIZE = 20;

/** Contact-form senders, one row per email address, most recently active first. */
@Component({
  selector: 'app-admin-messages',
  imports: [RouterLink, DatePipe, Icon, EmptyState, ErrorState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './admin-messages.scss',
  templateUrl: './admin-messages.html',
})
export default class AdminMessages {
  private readonly contacts = inject(ContactService);

  protected readonly query = signal('');
  protected readonly status = signal<ContactStatusFilter>(
    inject(ActivatedRoute).snapshot.queryParamMap.get('status') === 'unread' ? 'unread' : 'all',
  );
  private readonly page = signal(1);

  protected readonly hasFilters = computed(
    () => this.query().trim() !== '' || this.status() !== 'all',
  );

  protected readonly state = toSignal(
    toObservable(
      computed(() => ({ q: this.query(), status: this.status(), page: this.page() })),
    ).pipe(
      debounceTime(200),
      switchMap((query) =>
        withLoadState(
          this.contacts.list({ ...query, pageSize: PAGE_SIZE }),
          'Messages couldn’t be loaded.',
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as LoadState<PagedResult<ContactSummary>> },
  );

  protected setQuery(value: string): void {
    this.query.set(value);
    this.page.set(1);
  }

  protected setStatus(value: string): void {
    this.status.set(value === 'unread' ? 'unread' : 'all');
    this.page.set(1);
  }

  protected goTo(page: number): void {
    this.page.set(page);
  }
}
