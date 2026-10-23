import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResult, apiUrl } from '../api/api';
import {
  ContactDetails,
  ContactListQuery,
  ContactMessageReceipt,
  ContactMessageRequest,
  ContactSummary,
} from '../models/contact.model';

/**
 * Contact-form messages. Sending is public; everything else is admin-only and gets its bearer
 * token from the API interceptor.
 */
@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);

  send(request: ContactMessageRequest): Observable<ContactMessageReceipt> {
    return this.http.post<ContactMessageReceipt>(apiUrl('/contact-messages'), request);
  }

  list(query: ContactListQuery = {}): Observable<PagedResult<ContactSummary>> {
    let params = new HttpParams();
    const q = query.q?.trim();
    if (q) {
      params = params.set('q', q);
    }
    if (query.status && query.status !== 'all') {
      params = params.set('status', query.status);
    }
    if (query.page && query.page > 1) {
      params = params.set('page', query.page);
    }
    if (query.pageSize) {
      params = params.set('pageSize', query.pageSize);
    }
    return this.http.get<PagedResult<ContactSummary>>(apiUrl('/admin/contacts'), { params });
  }

  get(contactId: number): Observable<ContactDetails> {
    return this.http.get<ContactDetails>(apiUrl(`/admin/contacts/${contactId}`));
  }

  setAllRead(contactId: number, isRead: boolean): Observable<ContactDetails> {
    return this.http.put<ContactDetails>(apiUrl(`/admin/contacts/${contactId}/read`), { isRead });
  }

  setMessageRead(
    contactId: number,
    messageId: number,
    isRead: boolean,
  ): Observable<ContactDetails> {
    return this.http.put<ContactDetails>(
      apiUrl(`/admin/contacts/${contactId}/messages/${messageId}/read`),
      { isRead },
    );
  }

  delete(contactId: number): Observable<void> {
    return this.http.delete<void>(apiUrl(`/admin/contacts/${contactId}`));
  }
}
