import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WEATHER_LOCATION } from '../data/site-content';
import { OpenMeteoResponse, WeatherService, toWeatherForecast } from './weather.service';

const RESPONSE: OpenMeteoResponse = {
  current: {
    time: '2026-10-23T14:45',
    temperature_2m: 27.4,
    apparent_temperature: 30.1,
    relative_humidity_2m: 70,
    precipitation: 0,
    weather_code: 2,
    wind_speed_10m: 8.2,
    is_day: 1,
  },
  hourly: {
    time: ['2026-10-23T13:00', '2026-10-23T14:00', '2026-10-23T15:00', '2026-10-24T09:00'],
    temperature_2m: [26.1, 27, null, 23.5],
    precipitation_probability: [10, null, 40, 80],
    weather_code: [2, 61, 3, 63],
  },
  daily: {
    time: ['2026-10-23', '2026-10-24', '2026-10-25'],
    weather_code: [61, 80, 3],
    temperature_2m_max: [29, 28, 27],
    temperature_2m_min: [21, 20.5, null],
    precipitation_probability_max: [60, null, 10],
    precipitation_sum: [3.2, null, 0],
    sunrise: ['2026-10-23T06:01', null, '2026-10-25T06:01'],
    sunset: ['2026-10-23T18:04', null, '2026-10-25T18:03'],
    uv_index_max: [9.1, null, 7],
  },
};

describe('toWeatherForecast', () => {
  const retrievedAt = new Date('2026-10-23T09:16:00Z');

  it('maps current conditions and groups hours under their day', () => {
    const forecast = toWeatherForecast(RESPONSE, WEATHER_LOCATION, retrievedAt);

    expect(forecast.location).toBe(WEATHER_LOCATION);
    expect(forecast.retrievedAt).toBe(retrievedAt);
    expect(forecast.current).toEqual({
      time: '2026-10-23T14:45',
      temperatureC: 27.4,
      apparentTemperatureC: 30.1,
      humidityPercent: 70,
      precipitationMm: 0,
      windSpeedKmh: 8.2,
      isDay: true,
      condition: 'partly-cloudy',
      summary: 'Partly cloudy',
    });

    const [today, tomorrow] = forecast.days;
    expect(today).toMatchObject({
      date: '2026-10-23',
      condition: 'rain',
      summary: 'Light rain',
      precipitationProbability: 60,
      sunrise: '06:01',
      sunset: '18:04',
      uvIndexMax: 9.1,
    });
    // The 15:00 hour has no temperature, so it is left out.
    expect(today.hours.map((h) => [h.time, h.hour, h.precipitationProbability])).toEqual([
      ['13:00', 13, 10],
      ['14:00', 14, null],
    ]);
    expect(tomorrow).toMatchObject({
      precipitationProbability: null,
      precipitationMm: 0,
      sunrise: null,
      uvIndexMax: null,
    });
    expect(tomorrow.hours.map((h) => h.summary)).toEqual(['Rain']);
  });

  it('leaves out days with missing temperatures', () => {
    const forecast = toWeatherForecast(RESPONSE, WEATHER_LOCATION, retrievedAt);
    expect(forecast.days.map((d) => d.date)).toEqual(['2026-10-23', '2026-10-24']);
  });

  it('rejects incomplete responses', () => {
    expect(() =>
      toWeatherForecast({ ...RESPONSE, daily: undefined }, WEATHER_LOCATION, retrievedAt),
    ).toThrowError(/incomplete/);
  });
});

describe('WeatherService', () => {
  let weather: WeatherService;
  let http: HttpTestingController;

  const isForecastRequest = (r: { url: string }) => r.url === environment.weatherApiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    weather = TestBed.inject(WeatherService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests a 16-day forecast for Kandy in local time', async () => {
    const result = firstValueFrom(weather.getForecast());
    const request = http.expectOne(isForecastRequest);
    const params = request.request.params;
    expect(params.get('latitude')).toBe(String(WEATHER_LOCATION.latitude));
    expect(params.get('longitude')).toBe(String(WEATHER_LOCATION.longitude));
    expect(params.get('timezone')).toBe('Asia/Colombo');
    expect(params.get('forecast_days')).toBe('16');
    expect(params.get('hourly')).toContain('precipitation_probability');
    request.flush(RESPONSE);

    expect((await result).current.temperatureC).toBe(27.4);
  });

  it('reuses a recent forecast instead of asking again', async () => {
    const first = firstValueFrom(weather.getForecast());
    http.expectOne(isForecastRequest).flush(RESPONSE);
    await first;

    const second = await firstValueFrom(weather.getForecast());
    http.expectNone(isForecastRequest);
    expect(second.current.summary).toBe('Partly cloudy');
  });

  it('asks again after a failed request', async () => {
    const failed = firstValueFrom(weather.getForecast());
    http
      .expectOne(isForecastRequest)
      .flush('unavailable', { status: 503, statusText: 'Service Unavailable' });
    await expect(failed).rejects.toBeTruthy();

    const retried = firstValueFrom(weather.getForecast());
    http.expectOne(isForecastRequest).flush(RESPONSE);
    expect((await retried).days.length).toBe(2);
  });
});
