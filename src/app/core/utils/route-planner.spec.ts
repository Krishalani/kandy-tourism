import { BUDDHA, CITY_START, EMBEKKA, GARDENS, LAKE, TEMPLE } from '../../../testing/fixtures';
import { AttractionSummary } from '../models/attraction.model';
import { ResolvedStart } from '../models/trip-plan.model';
import {
  buildGoogleMapsDirectionsUrl,
  moveItem,
  numberStops,
  suggestShorterOrder,
  summarizeItinerary,
  toResolvedStart,
} from './route-planner';

const cityStart = toResolvedStart(CITY_START);
const latLng = (a: { latitude: number; longitude: number }) =>
  `${a.latitude.toFixed(6)},${a.longitude.toFixed(6)}`;

describe('route planner', () => {
  // Kandy Lake → Temple → Bahirawakanda → Peradeniya
  const example: AttractionSummary[] = [LAKE, TEMPLE, BUDDHA, GARDENS];

  it('numbers stops in the given order and marks only the last as final', () => {
    const stops = numberStops(example);
    expect(stops.map((s) => s.attraction.id)).toEqual([2, 1, 4, 3]);
    expect(stops.map((s) => s.order)).toEqual([1, 2, 3, 4]);
    expect(stops.map((s) => s.isFinal)).toEqual([false, false, false, true]);
  });

  it('resolves API starts with and without coordinates', () => {
    expect(cityStart).toEqual({
      type: 'preset',
      label: 'Kandy City Centre',
      point: { latitude: 7.2931, longitude: 80.6347 },
      query: undefined,
    });
    const typed = toResolvedStart({
      type: 'custom',
      query: 'Queen’s Hotel',
      label: 'Queen’s Hotel',
      coordinatesApproximate: false,
    });
    expect(typed.point).toBeUndefined();
    expect(typed.query).toBe('Queen’s Hotel');
  });

  it('builds a Google Maps URL with origin, ordered waypoints and final destination', () => {
    const url = new URL(buildGoogleMapsDirectionsUrl(cityStart, numberStops(example))!);

    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('origin')).toBe(latLng(cityStart.point!));
    expect(url.searchParams.get('waypoints')).toBe([LAKE, TEMPLE, BUDDHA].map(latLng).join('|'));
    expect(url.searchParams.get('destination')).toBe(latLng(GARDENS));
  });

  it('reflects a changed order in the URL', () => {
    const reordered = numberStops(moveItem(example, 3, 0));
    const url = new URL(buildGoogleMapsDirectionsUrl(cityStart, reordered)!);
    expect(url.searchParams.get('waypoints')!.split('|')[0]).toBe(latLng(GARDENS));
    expect(url.searchParams.get('destination')).toBe(latLng(BUDDHA));
  });

  it('omits waypoints for a single stop and returns null for none', () => {
    const url = new URL(buildGoogleMapsDirectionsUrl(cityStart, numberStops([TEMPLE]))!);
    expect(url.searchParams.has('waypoints')).toBe(false);
    expect(buildGoogleMapsDirectionsUrl(cityStart, [])).toBeNull();
  });

  it('encodes a typed start point safely', () => {
    const start: ResolvedStart = {
      type: 'custom',
      label: 'Hotel & Spa, Kandy',
      query: 'Hotel & Spa, Kandy',
    };
    const raw = buildGoogleMapsDirectionsUrl(start, numberStops([TEMPLE]))!;
    expect(raw).not.toContain('Hotel & Spa');
    expect(new URL(raw).searchParams.get('origin')).toBe('Hotel & Spa, Kandy');
  });

  it('sums visit durations and counts stops without one', () => {
    const stops = numberStops([
      TEMPLE,
      LAKE,
      { ...GARDENS, estimatedVisitDurationMinutes: undefined },
    ]);
    expect(summarizeItinerary(stops)).toEqual({
      stopCount: 3,
      totalVisitMinutes: 90 + 45,
      stopsWithoutDuration: 1,
    });
  });

  it('suggests an order without mutating the original stops', () => {
    const stops = numberStops([GARDENS, TEMPLE, EMBEKKA]);
    const before = stops.map((s) => s.attraction.id);
    const suggestion = suggestShorterOrder(cityStart.point, stops);
    expect(stops.map((s) => s.attraction.id)).toEqual(before);
    expect(new Set(suggestion.map((a) => a.id))).toEqual(new Set(before));
    expect(suggestion[0].id).toBe(TEMPLE.id);
  });
});
