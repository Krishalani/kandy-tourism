import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type * as Leaflet from 'leaflet';
import { ItineraryStop, ResolvedStart } from '../../../core/models/trip-plan.model';
import { Icon } from '../../../shared/components/icon/icon';

type LeafletModule = typeof Leaflet;

const KANDY_CENTRE: Leaflet.LatLngTuple = [7.2931, 80.6347];

/**
 * Schematic route preview. Markers follow the itinerary order and are joined by straight
 * dashed lines; it is not a road route. Leaflet is loaded lazily in the browser only.
 */
@Component({
  selector: 'app-route-map',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './route-map.scss',
  templateUrl: './route-map.html',
})
export class RouteMap {
  readonly start = input.required<ResolvedStart>();
  readonly stops = input.required<ItineraryStop[]>();

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('map');

  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly tilesFailed = signal(false);

  private L: LeafletModule | null = null;
  private map: Leaflet.Map | null = null;
  private layer: Leaflet.LayerGroup | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    afterNextRender(() => void this.init());

    effect(() => {
      const start = this.start();
      const stops = this.stops();
      if (this.status() === 'ready') {
        untracked(() => this.draw(start, stops));
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.resizeObserver?.disconnect();
      this.map?.remove();
    });
  }

  protected recenter(): void {
    this.draw(this.start(), this.stops());
  }

  private async init(): Promise<void> {
    try {
      const module = await import('leaflet');
      const L = ((module as unknown as { default?: LeafletModule }).default ??
        module) as LeafletModule;
      this.L = L;

      const map = L.map(this.container().nativeElement, {
        center: KANDY_CENTRE,
        zoom: 13,
        zoomSnap: 0.25,
        scrollWheelZoom: false,
        attributionControl: true,
      });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      })
        .on('tileerror', () => this.tilesFailed.set(true))
        .addTo(map);

      this.map = map;
      this.layer = L.layerGroup().addTo(map);

      // Refit only when the width changes; height-only changes (mobile URL bar) would
      // otherwise keep resetting the tourist's zoom.
      let lastWidth = this.container().nativeElement.clientWidth;
      this.resizeObserver = new ResizeObserver(([entry]) => {
        map.invalidateSize();
        const width = Math.round(entry.contentRect.width);
        if (width !== lastWidth) {
          lastWidth = width;
          this.draw(this.start(), this.stops());
        }
      });
      this.resizeObserver.observe(this.container().nativeElement);

      this.status.set('ready');
    } catch {
      this.status.set('error');
    }
  }

  private draw(start: ResolvedStart, stops: readonly ItineraryStop[]): void {
    const { L, map, layer } = this;
    if (!L || !map || !layer) {
      return;
    }
    layer.clearLayers();

    const path: Leaflet.LatLngTuple[] = [];

    if (start.point) {
      const position: Leaflet.LatLngTuple = [start.point.latitude, start.point.longitude];
      path.push(position);
      L.marker(position, {
        title: `Start: ${start.label}`,
        alt: `Start: ${start.label}`,
        // Below the numbered stops: when markers overlap, the visiting order matters most.
        zIndexOffset: -1000,
        icon: L.divIcon({
          className: '',
          html: '<span class="route-marker route-marker--start">Start</span>',
          iconSize: [52, 30],
          iconAnchor: [26, 15],
        }),
      })
        .bindPopup(popupContent('Start', start.label))
        .addTo(layer);
    }

    for (const stop of stops) {
      const { attraction } = stop;
      const position: Leaflet.LatLngTuple = [attraction.latitude, attraction.longitude];
      path.push(position);
      const label = `Stop ${stop.order}${stop.isFinal ? ' (final)' : ''}`;
      L.marker(position, {
        title: `${label}: ${attraction.name}`,
        alt: `${label}: ${attraction.name}`,
        zIndexOffset: 500 - stop.order,
        icon: L.divIcon({
          className: '',
          html: `<span class="route-marker${stop.isFinal ? ' route-marker--final' : ''}">${stop.order}</span>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        }),
      })
        .bindPopup(popupContent(label, attraction.name))
        .addTo(layer);
    }

    if (path.length > 1) {
      L.polyline(path, {
        color: '#22543a',
        weight: 4,
        opacity: 0.85,
        dashArray: '2 10',
        lineCap: 'round',
        interactive: false,
      }).addTo(layer);
    }

    if (path.length === 0) {
      map.setView(KANDY_CENTRE, 13);
    } else if (path.length === 1) {
      map.setView(path[0], 15);
    } else {
      const padding = map.getSize().x < 480 ? 28 : 48;
      map.fitBounds(L.latLngBounds(path), { padding: [padding, padding], maxZoom: 15 });
    }
  }
}

/** Builds popup DOM with textContent so user-entered names can never inject HTML. */
function popupContent(title: string, name: string): HTMLElement {
  const wrapper = document.createElement('div');
  const strong = document.createElement('strong');
  strong.textContent = title;
  const text = document.createElement('span');
  text.textContent = name;
  wrapper.append(strong, text);
  return wrapper;
}
