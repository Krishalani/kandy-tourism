import { SiteInfo } from '../models/site-info.model';

/** PROTOTYPE DATA: placeholder contact details, not a real organisation. */
export const MOCK_SITE_INFO: SiteInfo = {
  name: 'Kandy Day Trip Planner',
  tagline: 'Discover Kandy, your way',
  description:
    'A planning companion that helps visitors explore Kandy’s heritage, nature and viewpoints and organise them into a one-day itinerary.',
  contact: {
    email: 'hello@kandydaytrip.example',
    phone: '+94 81 000 0000',
    address: 'Kandy, Central Province, Sri Lanka',
    hours: 'Monday to Friday, 9:00 AM – 5:00 PM',
  },
};
