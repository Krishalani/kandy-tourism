import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { apiUrl } from '../api/api';
import { AttractionService } from './attraction.service';

describe('AttractionService.search', () => {
  let attractions: AttractionService;
  let http: HttpTestingController;

  const isSearch = (r: { url: string }) => r.url === apiUrl('/attractions');
  const empty = { items: [], page: 1, pageSize: 24, totalCount: 0, totalPages: 0 };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    attractions = TestBed.inject(AttractionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends several categories as one comma-separated filter', () => {
    attractions.search({ query: 'temple', categories: ['religious', 'heritage'] }).subscribe();
    const request = http.expectOne(isSearch);
    expect(request.request.params.get('q')).toBe('temple');
    expect(request.request.params.get('category')).toBe('religious,heritage');
    request.flush(empty);
  });

  it('sends no category filter when none is selected', () => {
    attractions.search({ categories: [] }).subscribe();
    const request = http.expectOne(isSearch);
    expect(request.request.params.has('category')).toBe(false);
    request.flush(empty);
  });

  it('still supports a single category', () => {
    attractions.search({ category: 'museums' }).subscribe();
    const request = http.expectOne(isSearch);
    expect(request.request.params.get('category')).toBe('museums');
    request.flush(empty);
  });
});
