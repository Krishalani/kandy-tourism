import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  BUDDHA,
  GARDENS,
  LAKE,
  PLAN_ID,
  PLAN_TOKEN,
  TEMPLE,
  itinerary,
} from '../../../testing/fixtures';
import { apiUrl } from '../api/api';
import { ToastService } from './toast.service';
import { GUEST_PLAN_STORAGE_KEY, TripPlanService, parseGuestPlanRef } from './trip-plan.service';

const planUrl = apiUrl(`/itineraries/${PLAN_ID}`);

describe('TripPlanService', () => {
  let plan: TripPlanService;
  let http: HttpTestingController;
  let toast: ToastService;

  /** Saves run on a promise queue, so requests appear after a few microtasks. */
  async function expectRequest(method: string, url: string): Promise<TestRequest> {
    for (let i = 0; i < 20; i++) {
      const [request] = http.match((r) => r.method === method && r.urlWithParams === url);
      if (request) {
        return request;
      }
      await new Promise((resolve) => setTimeout(resolve));
    }
    throw new Error(`Expected ${method} ${url}`);
  }

  async function settle(): Promise<void> {
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve));
    }
  }

  function storeRef(): void {
    localStorage.setItem(
      GUEST_PLAN_STORAGE_KEY,
      JSON.stringify({ version: 2, id: PLAN_ID, token: PLAN_TOKEN }),
    );
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    plan = TestBed.inject(TripPlanService);
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => http.verify());

  it('creates a guest plan on the first add and stores only its reference', async () => {
    await plan.restore();
    expect(plan.restored()).toBe(true);

    expect(plan.add(LAKE)).toBe('added');
    expect(plan.count()).toBe(1);

    (await expectRequest('POST', apiUrl('/itineraries'))).flush({
      accessToken: PLAN_TOKEN,
      itinerary: itinerary([]),
    });
    const add = await expectRequest('POST', `${planUrl}/stops`);
    expect(add.request.headers.get('X-Itinerary-Token')).toBe(PLAN_TOKEN);
    expect(add.request.body).toEqual({ attractionId: LAKE.id, position: undefined });
    add.flush(itinerary([LAKE]));
    await settle();

    expect(plan.stops().map((s) => s.attraction.id)).toEqual([LAKE.id]);
    const stored = JSON.parse(localStorage.getItem(GUEST_PLAN_STORAGE_KEY)!);
    expect(stored).toEqual({ version: 2, id: PLAN_ID, token: PLAN_TOKEN });
    expect(JSON.stringify(stored)).not.toContain(LAKE.name);
  });

  it('restores the saved plan in the server’s order and prevents duplicates', async () => {
    storeRef();
    const restoring = plan.restore();
    (await expectRequest('GET', planUrl)).flush(itinerary([LAKE, TEMPLE]));
    await restoring;

    expect(plan.stops().map((s) => s.attraction.id)).toEqual([LAKE.id, TEMPLE.id]);
    expect(plan.resolvedStart().label).toBe('Kandy City Centre');
    expect(plan.add(LAKE)).toBe('duplicate');
  });

  it('sends the full new order and keeps the directions URL in sync', async () => {
    storeRef();
    const restoring = plan.restore();
    (await expectRequest('GET', planUrl)).flush(itinerary([LAKE, TEMPLE, BUDDHA, GARDENS]));
    await restoring;

    plan.move(3, 0);
    expect(plan.stops().map((s) => s.attraction.id)).toEqual([
      GARDENS.id,
      LAKE.id,
      TEMPLE.id,
      BUDDHA.id,
    ]);

    const reorder = await expectRequest('PUT', `${planUrl}/stops/order`);
    expect(reorder.request.body).toEqual({
      attractionIds: [GARDENS.id, LAKE.id, TEMPLE.id, BUDDHA.id],
    });
    reorder.flush(itinerary([GARDENS, LAKE, TEMPLE, BUDDHA]));
    await settle();

    const url = new URL(plan.directionsUrl()!);
    expect(url.searchParams.get('destination')).toBe(
      `${BUDDHA.latitude.toFixed(6)},${BUDDHA.longitude.toFixed(6)}`,
    );
    expect(url.searchParams.get('waypoints')!.split('|')[0]).toBe(
      `${GARDENS.latitude.toFixed(6)},${GARDENS.longitude.toFixed(6)}`,
    );
  });

  it('rolls back to the saved plan and explains when a change fails', async () => {
    storeRef();
    const restoring = plan.restore();
    (await expectRequest('GET', planUrl)).flush(itinerary([LAKE, TEMPLE]));
    await restoring;

    const index = plan.remove(LAKE.id);
    expect(index).toBe(0);
    expect(plan.count()).toBe(1);

    (await expectRequest('DELETE', `${planUrl}/stops/${LAKE.id}`)).error(
      new ProgressEvent('error'),
      {
        status: 0,
      },
    );
    await settle();

    expect(plan.stops().map((s) => s.attraction.id)).toEqual([LAKE.id, TEMPLE.id]);
    expect(toast.toasts().at(-1)?.tone).toBe('error');
    expect(toast.toasts().at(-1)?.message).toContain('couldn’t reach the server');
  });

  it('undoes a removal by inserting at the original position', async () => {
    storeRef();
    const restoring = plan.restore();
    (await expectRequest('GET', planUrl)).flush(itinerary([LAKE, TEMPLE, GARDENS]));
    await restoring;

    plan.insertAt(BUDDHA, 1);
    expect(plan.stops().map((s) => s.attraction.id)).toEqual([
      LAKE.id,
      BUDDHA.id,
      TEMPLE.id,
      GARDENS.id,
    ]);
    const add = await expectRequest('POST', `${planUrl}/stops`);
    expect(add.request.body).toEqual({ attractionId: BUDDHA.id, position: 1 });
    add.flush(itinerary([LAKE, BUDDHA, TEMPLE, GARDENS]));
    await settle();
  });

  it('enforces the stop limit before calling the API', async () => {
    storeRef();
    const restoring = plan.restore();
    const ten = Array.from({ length: 10 }, (_, i) => ({ ...LAKE, id: 100 + i }));
    (await expectRequest('GET', planUrl)).flush(itinerary(ten));
    await restoring;

    expect(plan.add(TEMPLE)).toBe('full');
  });

  it('keeps the device location in memory only', async () => {
    storeRef();
    const restoring = plan.restore();
    (await expectRequest('GET', planUrl)).flush(itinerary([LAKE]));
    await restoring;

    await plan.setStart({ type: 'current', latitude: 7.3, longitude: 80.6 });

    expect(plan.resolvedStart()).toEqual({
      type: 'current',
      label: 'Your current location',
      point: { latitude: 7.3, longitude: 80.6 },
    });
    expect(localStorage.getItem(GUEST_PLAN_STORAGE_KEY)).not.toContain('80.6');
  });

  it('shows a load error but keeps the reference when the API is unreachable', async () => {
    storeRef();
    const restoring = plan.restore();
    (await expectRequest('GET', planUrl)).error(new ProgressEvent('error'), { status: 0 });
    await restoring;

    expect(plan.loadError()).toContain('couldn’t reach');
    expect(localStorage.getItem(GUEST_PLAN_STORAGE_KEY)).not.toBeNull();

    // Retrying shows "loading" (not an empty plan) until the saved plan arrives.
    const retrying = plan.restore();
    const retry = await expectRequest('GET', planUrl);
    expect(plan.restored()).toBe(false);
    expect(plan.loadError()).toBeNull();
    retry.flush(itinerary([LAKE, TEMPLE]));
    await retrying;
    expect(plan.restored()).toBe(true);
    expect(plan.count()).toBe(2);
  });

  it('saves the trip date and rolls it back if the API rejects it', async () => {
    storeRef();
    const restoring = plan.restore();
    (await expectRequest('GET', planUrl)).flush(itinerary([LAKE]));
    await restoring;

    const saving = plan.setTripDate('2026-10-25');
    expect(plan.tripDate()).toBe('2026-10-25');
    const request = await expectRequest('PUT', `${planUrl}/trip-date`);
    expect(request.request.body).toEqual({ tripDate: '2026-10-25' });
    request.flush({ ...itinerary([LAKE]), tripDate: '2026-10-25' });
    expect(await saving).toBe(true);

    const rejected = plan.setTripDate('2026-10-01');
    (await expectRequest('PUT', `${planUrl}/trip-date`)).flush(
      { status: 400, code: 'invalid-trip-date', detail: 'Choose today or a later date.' },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(await rejected).toBe(false);
    expect(plan.tripDate()).toBe('2026-10-25');
    expect(toast.toasts().at(-1)?.message).toBe('Choose today or a later date.');
  });

  it('turns the share link on and off', async () => {
    storeRef();
    const restoring = plan.restore();
    (await expectRequest('GET', planUrl)).flush(itinerary([LAKE]));
    await restoring;
    expect(plan.shareId()).toBeNull();

    const enabling = plan.enableSharing();
    (await expectRequest('POST', `${planUrl}/share`)).flush({
      ...itinerary([LAKE]),
      shareId: 'b1e2c3d4-0000-4000-8000-000000000001',
    });
    await enabling;
    expect(plan.shareId()).toBe('b1e2c3d4-0000-4000-8000-000000000001');

    const disabling = plan.disableSharing();
    expect(plan.shareId()).toBeNull();
    (await expectRequest('DELETE', `${planUrl}/share`)).flush(itinerary([LAKE]));
    expect(await disabling).toBe(true);
  });

  it('forgets a plan the server no longer has', async () => {
    storeRef();
    const restoring = plan.restore();
    (await expectRequest('GET', planUrl)).flush(
      { status: 404, code: 'itinerary-not-found', detail: 'We couldn’t find that saved plan.' },
      { status: 404, statusText: 'Not Found' },
    );
    await restoring;

    expect(plan.count()).toBe(0);
    expect(plan.loadError()).toBeNull();
    expect(localStorage.getItem(GUEST_PLAN_STORAGE_KEY)).toBeNull();
  });
});

describe('parseGuestPlanRef', () => {
  it('accepts only a well-formed reference', () => {
    expect(parseGuestPlanRef({ version: 2, id: PLAN_ID, token: PLAN_TOKEN })).toEqual({
      id: PLAN_ID,
      token: PLAN_TOKEN,
    });
    expect(parseGuestPlanRef(null)).toBeNull();
    expect(parseGuestPlanRef({ version: 1, stopIds: ['att-001'] })).toBeNull();
    expect(parseGuestPlanRef({ version: 2, id: 'not-a-guid', token: PLAN_TOKEN })).toBeNull();
    expect(parseGuestPlanRef({ version: 2, id: PLAN_ID, token: 'short' })).toBeNull();
  });
});
