import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { apiUrl } from '../api/api';
import { ContactService } from './contact.service';

describe('ContactService', () => {
  let contacts: ContactService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    contacts = TestBed.inject(ContactService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts the contact form', async () => {
    const message = {
      name: 'Asha',
      email: 'asha@example.com',
      subject: 'Parking',
      message: 'Is there parking near Kandy Lake?',
    };
    const result = firstValueFrom(contacts.send(message));
    const request = http.expectOne(apiUrl('/contact-messages'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(message);
    request.flush({ id: 7, receivedAtUtc: '2026-10-23T15:00:00Z' });
    expect((await result).id).toBe(7);
  });

  it('only sends the list filters that narrow the results', () => {
    contacts.list({ q: '  asha ', status: 'unread', page: 2, pageSize: 20 }).subscribe();
    const filtered = http.expectOne((r) => r.url === apiUrl('/admin/contacts'));
    expect(filtered.request.params.toString()).toBe('q=asha&status=unread&page=2&pageSize=20');
    filtered.flush({ items: [], page: 2, pageSize: 20, totalCount: 0, totalPages: 0 });

    contacts.list({ q: ' ', status: 'all', page: 1 }).subscribe();
    const unfiltered = http.expectOne((r) => r.url === apiUrl('/admin/contacts'));
    expect(unfiltered.request.params.keys()).toEqual([]);
    unfiltered.flush({ items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 });
  });

  it('updates read state for one message or the whole contact', () => {
    contacts.setMessageRead(3, 11, true).subscribe();
    const one = http.expectOne(apiUrl('/admin/contacts/3/messages/11/read'));
    expect(one.request.method).toBe('PUT');
    expect(one.request.body).toEqual({ isRead: true });
    one.flush({});

    contacts.setAllRead(3, false).subscribe();
    const all = http.expectOne(apiUrl('/admin/contacts/3/read'));
    expect(all.request.body).toEqual({ isRead: false });
    all.flush({});
  });

  it('deletes a contact', () => {
    contacts.delete(3).subscribe();
    const request = http.expectOne(apiUrl('/admin/contacts/3'));
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});
