import { RecentContactMessage } from './contact.model';

export interface AdminProfile {
  id: number;
  email: string;
  displayName: string;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresAtUtc: string;
  admin: AdminProfile;
}

export interface AdminDashboard {
  totalAttractions: number;
  featuredAttractions: number;
  categoriesInUse: number;
  approximateCoordinates: number;
  byCategory: { slug: string; name: string; count: number }[];
  guestItineraries: number;
  plannedStops: number;
  contacts: number;
  contactMessages: number;
  unreadMessages: number;
  recentMessages: RecentContactMessage[];
  confirmedTrips: number;
  completedTrips: number;
  /** Average overall rating (1–5, one decimal); absent until a trip has been rated. */
  averageRating?: number;
  recentFeedback: RecentFeedback[];
  topRatedAttractions: RatedAttraction[];
}

export interface RecentFeedback {
  rating: number;
  comment?: string;
  tripDate?: string;
  stopCount: number;
  submittedAtUtc: string;
}

export interface RatedAttraction {
  slug: string;
  name: string;
  averageRating: number;
  ratingCount: number;
}
