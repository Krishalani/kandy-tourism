/** Body of `POST /contact-messages` (`SendContactMessageRequest`). */
export interface ContactMessageRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactMessageReceipt {
  id: number;
  receivedAtUtc: string;
}

export type ContactStatusFilter = 'all' | 'unread';

export interface ContactListQuery {
  q?: string;
  status?: ContactStatusFilter;
  page?: number;
  pageSize?: number;
}

/** A row of the admin contacts table: one email address and its messages (`ContactSummaryDto`). */
export interface ContactSummary {
  id: number;
  name: string;
  email: string;
  messageCount: number;
  unreadCount: number;
  lastSubject: string;
  firstContactedAtUtc: string;
  lastMessageAtUtc: string;
}

export interface ContactMessage {
  id: number;
  subject: string;
  message: string;
  receivedAtUtc: string;
  isRead: boolean;
  readAtUtc?: string;
}

/** A contact with all of their messages, newest first (`ContactDetailsDto`). */
export interface ContactDetails {
  id: number;
  name: string;
  email: string;
  unreadCount: number;
  firstContactedAtUtc: string;
  lastMessageAtUtc: string;
  messages: ContactMessage[];
}

export interface RecentContactMessage {
  messageId: number;
  contactId: number;
  name: string;
  email: string;
  subject: string;
  receivedAtUtc: string;
  isRead: boolean;
}
