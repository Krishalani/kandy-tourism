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
}
