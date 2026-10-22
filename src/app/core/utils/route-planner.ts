import { Attraction } from '../models/attraction.model';
import {
  GeoPoint,
  ItineraryStop,
  ItinerarySummary,
  ResolvedStart,
  StartPoint,
  StartPreset,
} from '../models/trip-plan.model';
import { straightLineDistanceKm } from './geo';

/** Google Maps URLs support a destination plus at most nine waypoints. */
export const MAX_ITINERARY_STOPS = 10;

/** Mobile browsers may only honour this many waypoints in a directions URL. */
export const MOBILE_BROWSER_WAYPOINT_LIMIT = 3;

const GOOGLE_MAPS_DIRECTIONS_BASE = 'https://www.google.com/maps/dir/';

/** Resolves stored stop IDs into ordered stops, skipping IDs that no longer exist. */
export function resolveItinerary(
  stopIds: readonly string[],
  attractionsById: ReadonlyMap<string, Attraction>,
): ItineraryStop[] {
  const attractions = stopIds
    .map((id) => attractionsById.get(id))
    .filter((a): a is Attraction => a !== undefined);

  return attractions.map((attraction, index) => ({
    order: index + 1,
    isFinal: index === attractions.length - 1,
    attraction,
  }));
}

export function resolveStart(
  start: StartPoint,
  presets: readonly StartPreset[],
  attractionsById: ReadonlyMap<string, Attraction>,
): ResolvedStart {
  switch (start.type) {
    case 'preset': {
      const preset = presets.find((p) => p.id === start.presetId) ?? presets[0];
      return {
        type: 'preset',
        label: preset.label,
        point: { latitude: preset.latitude, longitude: preset.longitude },
      };
    }
    case 'attraction': {
      const attraction = attractionsById.get(start.attractionId);
      if (!attraction) {
        return resolveStart({ type: 'preset', presetId: presets[0].id }, presets, attractionsById);
      }
      return {
        type: 'attraction',
        label: attraction.name,
        point: { latitude: attraction.latitude, longitude: attraction.longitude },
      };
    }
    case 'custom':
      return { type: 'custom', label: start.query, query: start.query };
    case 'current':
      return {
        type: 'current',
        label: 'Your current location',
        point: { latitude: start.latitude, longitude: start.longitude },
      };
  }
}

function toLatLng(point: GeoPoint): string {
  return `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`;
}

function startParam(start: ResolvedStart): string | null {
  if (start.point) {
    return toLatLng(start.point);
  }
  const query = start.query?.trim();
  return query ? query : null;
}

/**
 * Builds a Google Maps directions URL that visits the stops in exactly the given order:
 * origin = start, waypoints = every stop except the last, destination = final stop.
 * Coordinates are used for stops to avoid ambiguity between similarly named places.
 * Returns null when there is nothing to navigate to.
 *
 * @see https://developers.google.com/maps/documentation/urls/get-started#directions-action
 */
export function buildGoogleMapsDirectionsUrl(
  start: ResolvedStart,
  stops: readonly ItineraryStop[],
  travelMode: 'driving' | 'walking' | 'transit' = 'driving',
): string | null {
  if (stops.length === 0) {
    return null;
  }

  const points = stops.map((s) => toLatLng(s.attraction));
  const destination = points[points.length - 1];
  const waypoints = points.slice(0, -1);

  const params = new URLSearchParams({ api: '1' });
  const origin = startParam(start);
  if (origin) {
    params.set('origin', origin);
  }
  params.set('destination', destination);
  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.join('|'));
  }
  params.set('travelmode', travelMode);

  return `${GOOGLE_MAPS_DIRECTIONS_BASE}?${params.toString()}`;
}

export function buildGoogleMapsPlaceUrl(point: GeoPoint): string {
  const params = new URLSearchParams({ api: '1', query: toLatLng(point) });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

export function summarizeItinerary(stops: readonly ItineraryStop[]): ItinerarySummary {
  let totalVisitMinutes = 0;
  let stopsWithoutDuration = 0;
  for (const stop of stops) {
    const minutes = stop.attraction.estimatedVisitDurationMinutes;
    if (minutes === undefined) {
      stopsWithoutDuration++;
    } else {
      totalVisitMinutes += minutes;
    }
  }
  return { stopCount: stops.length, totalVisitMinutes, stopsWithoutDuration };
}

/** Returns a copy of `items` with the item at `from` moved to `to`. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const result = [...items];
  if (from < 0 || from >= result.length || to < 0 || to >= result.length || from === to) {
    return result;
  }
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

/**
 * Suggests a visiting order using a nearest-neighbour heuristic on straight-line distance
 * from the start. This is only a suggestion; it never replaces the tourist's order unless
 * they explicitly accept it.
 */
export function suggestShorterOrder(
  start: GeoPoint | undefined,
  stops: readonly ItineraryStop[],
): Attraction[] {
  const remaining = stops.map((s) => s.attraction);
  if (remaining.length < 3) {
    return remaining;
  }
  const ordered: Attraction[] = [];
  let current: GeoPoint;
  if (start) {
    current = start;
  } else {
    const first = remaining.shift()!;
    ordered.push(first);
    current = first;
  }
  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    remaining.forEach((candidate, index) => {
      const distance = straightLineDistanceKm(current, candidate);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    current = next;
  }
  return ordered;
}

export function totalStraightLineKm(start: GeoPoint | undefined, attractions: readonly GeoPoint[]) {
  const points = start ? [start, ...attractions] : [...attractions];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += straightLineDistanceKm(points[i - 1], points[i]);
  }
  return total;
}
