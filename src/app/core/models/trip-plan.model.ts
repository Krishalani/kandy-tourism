import { AttractionSummary } from './attraction.model';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** A predefined place the tourist can start the day from (`StartPointDto`). */
export interface StartPreset extends GeoPoint {
  /** Stable slug, e.g. `kandy-city-centre`. */
  id: string;
  label: string;
  description: string;
  coordinatesApproximate: boolean;
  isDefault: boolean;
}

/** A start the tourist chooses. `current` (device location) is session-only and never sent to the API. */
export type StartPoint =
  | { type: 'preset'; presetId: string }
  | { type: 'attraction'; attractionId: number }
  | { type: 'custom'; query: string }
  | { type: 'current'; latitude: number; longitude: number };

/** A start point resolved into something the map and Google Maps link can use. */
export interface ResolvedStart {
  type: StartPoint['type'];
  label: string;
  /** Missing when the start is free text, which is not geocoded. */
  point?: GeoPoint;
  /** Free-text query passed to Google Maps when there are no coordinates. */
  query?: string;
}

export interface ItineraryStop {
  /** 1-based position in the tourist's chosen order. */
  order: number;
  isFinal: boolean;
  attraction: AttractionSummary;
}

export interface ItinerarySummary {
  stopCount: number;
  totalVisitMinutes: number;
  /** Number of stops without a duration estimate (excluded from the total). */
  stopsWithoutDuration: number;
}

export type AddToPlanResult = 'added' | 'duplicate' | 'full';

/** Starting point as persisted and resolved by the API (`ItineraryStartDto`). */
export interface ItineraryStartDto {
  type: 'preset' | 'attraction' | 'custom';
  presetSlug?: string;
  attractionId?: number;
  query?: string;
  label: string;
  latitude?: number;
  longitude?: number;
  coordinatesApproximate: boolean;
}

/** A guest itinerary (`ItineraryDto`); stops are in the tourist's visiting order. */
export interface Itinerary {
  id: string;
  start: ItineraryStartDto;
  stops: { order: number; attraction: AttractionSummary }[];
  maxStops: number;
  updatedAtUtc: string;
}

export interface CreatedItinerary {
  accessToken: string;
  itinerary: Itinerary;
}

/** The only thing kept in the browser: which server-side plan is this visitor's. */
export interface GuestPlanRef {
  id: string;
  token: string;
}
