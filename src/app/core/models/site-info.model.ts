export interface SiteContactInfo {
  email: string;
  phone: string;
  address: string;
  hours: string;
}

export interface SiteInfo {
  name: string;
  tagline: string;
  description: string;
  contact: SiteContactInfo;
}
