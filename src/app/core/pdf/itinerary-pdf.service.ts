import { Injectable, inject } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';
import { Attraction } from '../models/attraction.model';
import { ItineraryStop, ResolvedStart } from '../models/trip-plan.model';
import { AttractionService } from '../services/attraction.service';
import { WeatherService } from '../services/weather.service';
import { buildGoogleMapsDirectionsUrl, summarizeItinerary } from '../utils/route-planner';
import { planningAdvice } from '../utils/weather';
import type { ItineraryPdfWeather } from './itinerary-pdf';

export interface ItineraryPdfRequest {
  start: ResolvedStart;
  stops: readonly ItineraryStop[];
  tripDate: string | null;
}

export interface ItineraryPdfResult {
  /** True when some stops are in the PDF with their summary only. */
  missingDetails: boolean;
}

/**
 * Builds and downloads the itinerary PDF for My Plan, the "ready" page and shared plans. The PDF
 * library is loaded only when a PDF is requested.
 */
@Injectable({ providedIn: 'root' })
export class ItineraryPdfService {
  private readonly attractions = inject(AttractionService);
  private readonly weather = inject(WeatherService);

  async download(request: ItineraryPdfRequest): Promise<ItineraryPdfResult> {
    const [pdf, details, weather] = await Promise.all([
      import('./itinerary-pdf'),
      Promise.all(request.stops.map((s) => this.details(s.attraction.slug))),
      this.tripWeather(request),
    ]);
    const generatedAt = new Date();
    pdf
      .createItineraryPdf({
        start: request.start,
        stops: request.stops,
        details,
        summary: summarizeItinerary(request.stops),
        directionsUrl: buildGoogleMapsDirectionsUrl(request.start, request.stops),
        tripDate: request.tripDate,
        weather,
        generatedAt,
      })
      .save(pdf.itineraryPdfFileName(request.tripDate ?? generatedAt));
    return { missingDetails: details.some((d) => d === null) };
  }

  private details(slug: string): Promise<Attraction | null> {
    return firstValueFrom(this.attractions.getBySlug(slug)).catch(() => null);
  }

  /** The trip day's forecast, if it is within the forecast range; the PDF is made without it otherwise. */
  private async tripWeather(request: ItineraryPdfRequest): Promise<ItineraryPdfWeather | null> {
    if (!request.tripDate) {
      return null;
    }
    const forecast = await firstValueFrom(
      this.weather.getForecast().pipe(catchError(() => of(null))),
    );
    const day = forecast?.days.find((d) => d.date === request.tripDate);
    if (!day) {
      return null;
    }
    return {
      summary: day.summary,
      maxTemperatureC: day.maxTemperatureC,
      minTemperatureC: day.minTemperatureC,
      precipitationProbability: day.precipitationProbability,
      advice: planningAdvice(
        day,
        request.stops.map((s) => s.attraction),
      ).message,
    };
  }
}
