import {
  Attraction,
  AttractionSearchCriteria,
  DurationFilter,
  getCategoryInfo,
} from '../models/attraction.model';

export const DURATION_FILTERS: { id: DurationFilter; label: string }[] = [
  { id: 'any', label: 'Any length' },
  { id: 'short', label: 'Quick stop (under 1 hr)' },
  { id: 'medium', label: '1 – 2 hours' },
  { id: 'long', label: 'Half day (2 hrs +)' },
];

function matchesDuration(minutes: number | undefined, filter: DurationFilter): boolean {
  if (filter === 'any') {
    return true;
  }
  if (minutes === undefined) {
    return false;
  }
  switch (filter) {
    case 'short':
      return minutes < 60;
    case 'medium':
      return minutes >= 60 && minutes <= 120;
    case 'long':
      return minutes > 120;
  }
}

function normalise(text: string): string {
  return text
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '');
}

// Descriptions and addresses are excluded: many mention nearby landmarks ("beside the Temple of
// the Tooth"), which would make keyword searches match unrelated places.
function searchableText(a: Attraction): string {
  return normalise([a.name, a.area, getCategoryInfo(a.category).label, ...a.tags].join(' '));
}

/**
 * Filters and sorts attractions. Shared by the mock service and the Explore page so a
 * future API can apply the same rules server-side.
 */
export function filterAttractions(
  attractions: readonly Attraction[],
  criteria: AttractionSearchCriteria,
): Attraction[] {
  const terms = normalise(criteria.query ?? '')
    .split(/\s+/)
    .filter(Boolean);
  const category = criteria.category ?? 'all';
  const duration = criteria.duration ?? 'any';

  const results = attractions.filter((a) => {
    if (category !== 'all' && a.category !== category) {
      return false;
    }
    if (!matchesDuration(a.estimatedVisitDurationMinutes, duration)) {
      return false;
    }
    if (terms.length === 0) {
      return true;
    }
    const haystack = searchableText(a);
    return terms.every((term) => haystack.includes(term));
  });

  const byName = (x: Attraction, y: Attraction) => x.name.localeCompare(y.name);
  const durationOf = (a: Attraction, missing: number) => a.estimatedVisitDurationMinutes ?? missing;

  switch (criteria.sort ?? 'recommended') {
    case 'name':
      return results.sort(byName);
    case 'duration-asc':
      return results.sort(
        (x, y) => durationOf(x, Infinity) - durationOf(y, Infinity) || byName(x, y),
      );
    case 'duration-desc':
      return results.sort((x, y) => durationOf(y, -1) - durationOf(x, -1) || byName(x, y));
    case 'recommended':
    default:
      return results.sort((x, y) => Number(y.featured) - Number(x.featured));
  }
}
