import { IconName } from '../../shared/components/icon/icons';

export type AttractionCategory =
  'heritage' | 'religious' | 'nature' | 'viewpoints' | 'museums' | 'lakes';

export interface CategoryInfo {
  id: AttractionCategory;
  label: string;
  icon: IconName;
}

export const ATTRACTION_CATEGORIES: readonly CategoryInfo[] = [
  { id: 'heritage', label: 'Heritage & Culture', icon: 'landmark' },
  { id: 'religious', label: 'Religious Sites', icon: 'temple' },
  { id: 'nature', label: 'Nature & Gardens', icon: 'leaf' },
  { id: 'viewpoints', label: 'Viewpoints', icon: 'mountain' },
  { id: 'museums', label: 'Museums', icon: 'museum' },
  { id: 'lakes', label: 'Lakes & Scenic Places', icon: 'waves' },
];

export function getCategoryInfo(id: AttractionCategory): CategoryInfo {
  return ATTRACTION_CATEGORIES.find((c) => c.id === id) ?? ATTRACTION_CATEGORIES[0];
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

/** Shape shared by the mock data and a future ASP.NET Core Web API DTO. */
export interface Attraction {
  id: string;
  name: string;
  slug: string;
  category: AttractionCategory;
  shortDescription: string;
  description: string[];
  imageUrl: string;
  imageAlt: string;
  imageCredit?: ImageCredit;
  gallery: GalleryImage[];
  address: string;
  area: string;
  latitude: number;
  longitude: number;
  /** True when the coordinates are a best-effort estimate rather than a surveyed point. */
  coordinatesApproximate: boolean;
  estimatedVisitDurationMinutes?: number;
  /** Demo estimate only; never present as confirmed information. */
  openingHours?: string;
  /** Demo estimate only; never present as confirmed information. */
  entranceFee?: string;
  visitorTips: string[];
  featured: boolean;
  tags: string[];
}

/** Editable fields for creating or updating an attraction. */
export type AttractionDraft = Omit<Attraction, 'id'>;

export type AttractionSort = 'recommended' | 'name' | 'duration-asc' | 'duration-desc';

export type DurationFilter = 'any' | 'short' | 'medium' | 'long';

export interface AttractionSearchCriteria {
  query?: string;
  category?: AttractionCategory | 'all';
  duration?: DurationFilter;
  sort?: AttractionSort;
}
