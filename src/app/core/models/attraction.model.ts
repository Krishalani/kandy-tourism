import { IconName } from '../../shared/components/icon/icons';

/** Category slug as returned by the API, e.g. `religious`. */
export type AttractionCategory = string;

export interface CategoryInfo {
  id: AttractionCategory;
  label: string;
  icon: IconName;
  description?: string;
}

const CATEGORY_ICONS: Readonly<Record<string, IconName>> = {
  heritage: 'landmark',
  religious: 'temple',
  nature: 'leaf',
  viewpoints: 'mountain',
  museums: 'museum',
  lakes: 'waves',
};

/** Presentation only: categories come from the API, icons are chosen by the UI. */
export function categoryIcon(slug: AttractionCategory): IconName {
  return CATEGORY_ICONS[slug] ?? 'map-pin';
}

export interface ImageCredit {
  label: string;
  sourceUrl: string;
}

export interface GalleryImage {
  url: string;
  alt: string;
  credit?: ImageCredit;
}

/** List/card shape (`AttractionSummaryDto`); also embedded in itinerary stops. */
export interface AttractionSummary {
  id: number;
  name: string;
  slug: string;
  category: AttractionCategory;
  categoryName: string;
  shortDescription: string;
  imageUrl: string;
  imageAlt: string;
  area: string;
  latitude: number;
  longitude: number;
  /** True when the coordinates are a best-effort estimate rather than a surveyed point. */
  coordinatesApproximate: boolean;
  /** Demo estimate only; never present as confirmed information. */
  estimatedVisitDurationMinutes?: number;
  featured: boolean;
}

/** Details shape (`AttractionDetailsDto`). */
export interface Attraction extends AttractionSummary {
  description: string[];
  imageCredit?: ImageCredit;
  gallery: GalleryImage[];
  address: string;
  /** Demo estimate only; never present as confirmed information. */
  openingHours?: string;
  /** Demo estimate only; never present as confirmed information. */
  entranceFee?: string;
  visitorTips: string[];
  tags: string[];
}

/** Admin create/update payload (`AttractionUpsertRequest`). */
export type AttractionDraft = Omit<Attraction, 'id' | 'categoryName'>;

export interface NearbyAttraction {
  attraction: AttractionSummary;
  /** Straight-line distance; not a travel distance. */
  distanceKm: number;
}

export type AttractionSort = 'recommended' | 'name' | 'duration-asc' | 'duration-desc';

export type DurationFilter = 'any' | 'short' | 'medium' | 'long';

export interface AttractionSearchCriteria {
  query?: string;
  category?: AttractionCategory | 'all';
  duration?: DurationFilter;
  sort?: AttractionSort;
  featured?: boolean;
  page?: number;
  pageSize?: number;
}

export const DURATION_FILTERS: { id: DurationFilter; label: string }[] = [
  { id: 'any', label: 'Any length' },
  { id: 'short', label: 'Quick stop (under 1 hr)' },
  { id: 'medium', label: '1 – 2 hours' },
  { id: 'long', label: 'Half day (2 hrs +)' },
];
