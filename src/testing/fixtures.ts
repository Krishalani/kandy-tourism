import { AttractionSummary } from '../app/core/models/attraction.model';
import { Itinerary, ItineraryStartDto } from '../app/core/models/trip-plan.model';

/** TEST FIXTURES ONLY: a few attractions in the shape the Web API returns. */
function attraction(
  id: number,
  name: string,
  latitude: number,
  longitude: number,
  minutes: number | undefined,
): AttractionSummary {
  return {
    id,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    category: 'heritage',
    categoryName: 'Heritage & Culture',
    shortDescription: `${name} summary`,
    imageUrl: '/images/attraction-placeholder.svg',
    imageAlt: name,
    area: 'Kandy City',
    latitude,
    longitude,
    coordinatesApproximate: false,
    estimatedVisitDurationMinutes: minutes,
    featured: false,
  };
}

export const TEMPLE = attraction(1, 'Temple of the Sacred Tooth Relic', 7.2936, 80.6414, 90);
export const LAKE = attraction(2, 'Kandy Lake', 7.2918, 80.6436, 45);
export const GARDENS = attraction(3, 'Royal Botanical Gardens', 7.2711, 80.5956, 150);
export const BUDDHA = attraction(4, 'Bahirawakanda Buddha Statue', 7.2963, 80.6279, 45);
export const EMBEKKA = attraction(11, 'Embekka Devalaya', 7.2179, 80.5677, 60);

export const CITY_START: ItineraryStartDto = {
  type: 'preset',
  presetSlug: 'kandy-city-centre',
  label: 'Kandy City Centre',
  latitude: 7.2931,
  longitude: 80.6347,
  coordinatesApproximate: false,
};

export const PLAN_ID = '3f2b6c1e-8d4a-4f7e-9b1c-2a5d6e7f8091';
export const PLAN_TOKEN = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ';

export function itinerary(
  stops: AttractionSummary[],
  start: ItineraryStartDto = CITY_START,
): Itinerary {
  return {
    id: PLAN_ID,
    start,
    stops: stops.map((a, i) => ({ order: i + 1, attraction: a })),
    maxStops: 10,
    updatedAtUtc: '2026-10-23T00:00:00Z',
  };
}
