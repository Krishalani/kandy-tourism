import { SiteInfo } from '../models/site-info.model';
import { WeatherLocation } from '../models/weather.model';

/**
 * Static page content (not attraction data, which comes from the Web API).
 * The contact details are placeholders and are labelled as such wherever they appear.
 */
export const SITE_INFO: SiteInfo = {
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

export const HERO_IMAGE = {
  url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/SL_Kandy_asv2020-01_img10_Arthurs_Seat_view.jpg/1280px-SL_Kandy_asv2020-01_img10_Arthurs_Seat_view.jpg',
  alt: 'Kandy Lake and the city of Kandy seen from the surrounding hills',
  credit: {
    label: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:SL_Kandy_asv2020-01_img10_Arthurs_Seat_view.jpg',
  },
};

export const ABOUT_IMAGE = {
  url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/View_point_of_Kandy.jpg/960px-View_point_of_Kandy.jpg',
  alt: 'Kandy Lake and the city spread across the valley, seen from a hillside viewpoint',
  credit: {
    label: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:View_point_of_Kandy.jpg',
  },
};

/** Where the My Plan weather forecast is for (Kandy City Centre, the default starting point). */
export const WEATHER_LOCATION: WeatherLocation = {
  name: 'Kandy',
  latitude: 7.2931,
  longitude: 80.6347,
  timeZone: 'Asia/Colombo',
};

/**
 * "Try a sample day" offered on the empty My Plan page, in visiting order. Only slugs are kept
 * here; the API adds the matching attractions and skips any that are no longer listed.
 */
export const SAMPLE_DAY_SLUGS: readonly string[] = [
  'kandy-lake',
  'temple-of-the-sacred-tooth-relic',
  'bahirawakanda-buddha-statue',
  'royal-botanical-gardens-peradeniya',
];
