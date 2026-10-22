import { TestBed } from '@angular/core/testing';
import { AttractionService } from './attraction.service';
import { MockAttractionService } from './mock-attraction.service';
import { TRIP_PLAN_STORAGE_KEY, TripPlanService, parseTripPlan } from './trip-plan.service';

describe('TripPlanService', () => {
  let plan: TripPlanService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: AttractionService, useExisting: MockAttractionService }],
    });
    plan = TestBed.inject(TripPlanService);
    plan.restore();
  });

  it('adds stops in order and prevents duplicates', () => {
    expect(plan.add('att-002')).toBe('added');
    expect(plan.add('att-001')).toBe('added');
    expect(plan.add('att-002')).toBe('duplicate');
    expect(plan.stops().map((s) => s.attraction.id)).toEqual(['att-002', 'att-001']);
    expect(plan.count()).toBe(2);
  });

  it('reorders, removes and keeps the directions URL in sync', () => {
    plan.addMany(['att-002', 'att-001', 'att-004', 'att-003']);
    plan.move(3, 0);
    expect(plan.stops().map((s) => s.attraction.id)).toEqual([
      'att-003',
      'att-002',
      'att-001',
      'att-004',
    ]);

    plan.remove('att-002');
    expect(plan.stops().map((s) => s.order)).toEqual([1, 2, 3]);
    const destination = new URL(plan.directionsUrl()!).searchParams.get('destination');
    const final = plan.stops().at(-1)!.attraction;
    expect(destination).toBe(`${final.latitude.toFixed(6)},${final.longitude.toFixed(6)}`);
  });

  it('can undo a removal at the original position', () => {
    plan.addMany(['att-001', 'att-002', 'att-003']);
    const index = plan.remove('att-002');
    plan.insertAt('att-002', index);
    expect(plan.stops().map((s) => s.attraction.id)).toEqual(['att-001', 'att-002', 'att-003']);
  });

  it('prunes a stop whose attraction was deleted from the data source', () => {
    const data = TestBed.inject(MockAttractionService);
    plan.addMany(['att-001', 'att-002']);
    data.deleteAttraction('att-002').subscribe();
    plan.remove('att-002');
    expect(JSON.parse(localStorage.getItem(TRIP_PLAN_STORAGE_KEY)!).stopIds).toEqual(['att-001']);
    data.resetDemoData();
  });

  it('enforces the stop limit', () => {
    const ids = Array.from(
      { length: plan.maxStops },
      (_, i) => `att-${String(i + 1).padStart(3, '0')}`,
    );
    plan.addMany(ids);
    expect(plan.add('att-015')).toBe('full');
  });

  it('persists to localStorage and restores the same order', () => {
    plan.addMany(['att-004', 'att-001']);
    const stored = JSON.parse(localStorage.getItem(TRIP_PLAN_STORAGE_KEY)!);
    expect(stored.stopIds).toEqual(['att-004', 'att-001']);
  });

  it('does not persist the device location', () => {
    plan.setStart({ type: 'current', latitude: 7.3, longitude: 80.6 });
    const stored = JSON.parse(localStorage.getItem(TRIP_PLAN_STORAGE_KEY)!);
    expect(stored.start.type).toBe('preset');
  });
});

describe('parseTripPlan', () => {
  it('rejects missing or malformed data', () => {
    expect(parseTripPlan(null)).toBeNull();
    expect(parseTripPlan('nonsense')).toBeNull();
    expect(parseTripPlan({ version: 2, stopIds: [] })).toBeNull();
    expect(parseTripPlan({ version: 1, stopIds: 'att-001' })).toBeNull();
  });

  it('cleans up stop IDs and falls back to the default start', () => {
    const parsed = parseTripPlan({
      version: 1,
      stopIds: ['att-001', 42, 'att-001', '', 'att-002'],
      start: { type: 'preset', presetId: 'nowhere' },
    });
    expect(parsed?.stopIds).toEqual(['att-001', 'att-002']);
    expect(parsed?.start).toEqual({ type: 'preset', presetId: 'kandy-city-centre' });
  });
});
