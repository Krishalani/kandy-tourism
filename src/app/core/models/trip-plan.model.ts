import { Attraction } from './attraction.model';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** A predefined place the tourist can start the day from. */
export interface StartPreset extends GeoPoint {
  id: string;
  label: string;
  description: string;
  coordinatesApproximate: boolean;
}

export type StartPoint =
  | { type: 'preset'; presetId: string }
  | { type: 'attraction'; attractionId: string }
  | { type: 'custom'; query: string }
  | { type: 'current'; latitude: number; longitude: number };

/** The persisted trip plan. Only IDs are stored so attraction details stay in one place. */
export interface TripPlanState {
  version: 1;
  stopIds: string[];
  start: StartPoint;
}

/** A start point resolved into something the map and Google Maps link can use. */
export interface ResolvedStart {
  type: StartPoint['type'];
  label: string;
  /** Missing when the start is free text that the prototype cannot geocode. */
  point?: GeoPoint;
  /** Free-text query passed to Google Maps when there are no coordinates. */
  query?: string;
}

export interface ItineraryStop {
  /** 1-based position in the tourist's chosen order. */
  order: number;
  isFinal: boolean;
  attraction: Attraction;
}

export interface ItinerarySummary {
  stopCount: number;
  totalVisitMinutes: number;
  /** Number of stops without a duration estimate (excluded from the total). */
  stopsWithoutDuration: number;
}

export type AddToPlanResult = 'added' | 'duplicate' | 'full';
