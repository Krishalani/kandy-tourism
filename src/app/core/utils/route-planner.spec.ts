import { MOCK_ATTRACTIONS } from '../data/attractions.mock';
import { MOCK_START_PRESETS } from '../data/start-presets.mock';
import { Attraction } from '../models/attraction.model';
import { ResolvedStart } from '../models/trip-plan.model';
import {
  buildGoogleMapsDirectionsUrl,
  moveItem,
  resolveItinerary,
  resolveStart,
  suggestShorterOrder,
  summarizeItinerary,
} from './route-planner';

const byId = new Map<string, Attraction>(MOCK_ATTRACTIONS.map((a) => [a.id, a]));
const find = (id: string) => byId.get(id)!;
const cityStart = resolveStart(
  { type: 'preset', presetId: 'kandy-city-centre' },
  MOCK_START_PRESETS,
  byId,
);
const latLng = (a: { latitude: number; longitude: number }) =>
  `${a.latitude.toFixed(6)},${a.longitude.toFixed(6)}`;

describe('route planner', () => {
  // Kandy Lake → Temple → Bahirawakanda → Peradeniya
  const exampleIds = ['att-002', 'att-001', 'att-004', 'att-003'];

  it('resolves stops in the stored order and marks only the last as final', () => {
    const stops = resolveItinerary(exampleIds, byId);
    expect(stops.map((s) => s.attraction.id)).toEqual(exampleIds);
    expect(stops.map((s) => s.order)).toEqual([1, 2, 3, 4]);
    expect(stops.map((s) => s.isFinal)).toEqual([false, false, false, true]);
  });

  it('skips IDs that no longer exist without breaking numbering', () => {
    const stops = resolveItinerary(['att-002', 'missing', 'att-001'], byId);
    expect(stops.map((s) => s.order)).toEqual([1, 2]);
    expect(stops[1].isFinal).toBe(true);
  });

  it('builds a Google Maps URL with origin, ordered waypoints and final destination', () => {
    const stops = resolveItinerary(exampleIds, byId);
    const url = new URL(buildGoogleMapsDirectionsUrl(cityStart, stops)!);

    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('origin')).toBe(latLng(cityStart.point!));
    expect(url.searchParams.get('waypoints')).toBe(
      [find('att-002'), find('att-001'), find('att-004')].map(latLng).join('|'),
    );
    expect(url.searchParams.get('destination')).toBe(latLng(find('att-003')));
  });

  it('reflects a changed order in the URL', () => {
    const reordered = resolveItinerary(moveItem(exampleIds, 3, 0), byId);
    const url = new URL(buildGoogleMapsDirectionsUrl(cityStart, reordered)!);
    expect(url.searchParams.get('waypoints')!.split('|')[0]).toBe(latLng(find('att-003')));
    expect(url.searchParams.get('destination')).toBe(latLng(find('att-004')));
  });

  it('omits waypoints for a single stop and returns null for none', () => {
    const one = resolveItinerary(['att-001'], byId);
    const url = new URL(buildGoogleMapsDirectionsUrl(cityStart, one)!);
    expect(url.searchParams.has('waypoints')).toBe(false);
    expect(buildGoogleMapsDirectionsUrl(cityStart, [])).toBeNull();
  });

  it('encodes a typed start point safely', () => {
    const start: ResolvedStart = {
      type: 'custom',
      label: 'Hotel & Spa, Kandy',
      query: 'Hotel & Spa, Kandy',
    };
    const raw = buildGoogleMapsDirectionsUrl(start, resolveItinerary(['att-001'], byId))!;
    expect(raw).not.toContain('Hotel & Spa');
    expect(new URL(raw).searchParams.get('origin')).toBe('Hotel & Spa, Kandy');
  });

  it('sums visit durations and counts stops without one', () => {
    const stops = resolveItinerary(['att-001', 'att-002'], byId);
    stops.push({
      order: 3,
      isFinal: true,
      attraction: { ...find('att-003'), estimatedVisitDurationMinutes: undefined },
    });
    expect(summarizeItinerary(stops)).toEqual({
      stopCount: 3,
      totalVisitMinutes: 90 + 45,
      stopsWithoutDuration: 1,
    });
  });

  it('suggests an order without mutating the original stops', () => {
    const stops = resolveItinerary(['att-003', 'att-001', 'att-011'], byId);
    const before = stops.map((s) => s.attraction.id);
    const suggestion = suggestShorterOrder(cityStart.point, stops);
    expect(stops.map((s) => s.attraction.id)).toEqual(before);
    expect(new Set(suggestion.map((a) => a.id))).toEqual(new Set(before));
    expect(suggestion[0].id).toBe('att-001');
  });
});
