import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { apiErrorMessage } from '../../../core/api/api';
import { ContactDetails, ContactMessage } from '../../../core/models/contact.model';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ContactService } from '../../../core/services/contact.service';
import { ToastService } from '../../../core/services/toast.service';
import { LoadState, withLoadState } from '../../../core/utils/load-state';
import { Icon } from '../../../shared/components/icon/icon';
import { ErrorState } from '../../../shared/components/state/error-state';
import { LoadingState } from '../../../shared/components/state/loading-state';

/** Everything one person has sent through the contact form, newest first. */
@Component({
  selector: 'app-admin-contact',
  imports: [RouterLink, DatePipe, Icon, ErrorState, LoadingState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './admin-contact.scss',
  templateUrl: './admin-contact.html',
})
export default class AdminContact {
  private readonly contacts = inject(ContactService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly contactId = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

  protected readonly state = signal<LoadState<ContactDetails>>({ status: 'loading' });
  protected readonly busy = signal(false);

  constructor() {
    this.load();
  }

  protected load(): void {
    withLoadState(this.contacts.get(this.contactId), 'This contact couldn’t be loaded.')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => this.state.set(state));
  }

  protected setRead(message: ContactMessage, isRead: boolean): void {
    this.save(this.contacts.setMessageRead(this.contactId, message.id, isRead));
  }

  protected setAllRead(isRead: boolean): void {
    this.save(this.contacts.setAllRead(this.contactId, isRead));
  }

  protected async remove(contact: ContactDetails): Promise<void> {
    const count = contact.messages.length;
    const confirmed = await this.confirm.confirm({
      title: `Delete “${contact.name}”?`,
      message:
        `This permanently deletes ${contact.email} and ${count === 1 ? 'their message' : `all ${count} messages`}. ` +
        'This can’t be undone.',
      confirmLabel: 'Delete contact',
      cancelLabel: 'Keep',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }
    this.busy.set(true);
    this.contacts
      .delete(this.contactId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.show(`${contact.name} and their messages were deleted.`, { tone: 'info' });
          void this.router.navigateByUrl('/admin/messages');
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.toast.show(
            apiErrorMessage(error, 'The contact couldn’t be deleted. Please try again.'),
            {
              tone: 'error',
            },
          );
        },
      });
  }

  /** A mailto link that opens the admin's own mail client with the reply subject filled in. */
  protected replyLink(contact: ContactDetails, subject: string | undefined): string {
    const reply = subject ? `?subject=${encodeURIComponent(`Re: ${subject}`)}` : '';
    return `mailto:${contact.email}${reply}`;
  }

  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  private save(request: Observable<ContactDetails>): void {
    this.busy.set(true);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.busy.set(false);
        this.state.set({ status: 'ready', data });
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.toast.show(apiErrorMessage(error, 'The change couldn’t be saved. Please try again.'), {
          tone: 'error',
        });
      },
    });
  }
}
