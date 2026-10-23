import { jsPDF } from 'jspdf';
import { RowInput, autoTable } from 'jspdf-autotable';
import { SITE_INFO } from '../../core/data/site-content';
import { Attraction } from '../../core/models/attraction.model';
import { ItineraryStop, ItinerarySummary, ResolvedStart } from '../../core/models/trip-plan.model';
import { buildGoogleMapsPlaceUrl } from '../../core/utils/route-planner';
import { formatDuration } from '../../shared/pipes/duration.pipe';

export interface ItineraryPdfData {
  start: ResolvedStart;
  stops: readonly ItineraryStop[];
  /** Full attraction details in the same order as `stops`; `null` where they couldn't be loaded. */
  details: readonly (Attraction | null)[];
  summary: ItinerarySummary;
  directionsUrl: string | null;
  generatedAt: Date;
}

type Rgb = [number, number, number];
type FontStyle = 'normal' | 'bold' | 'italic';

interface TextStyle {
  size: number;
  style?: FontStyle;
  color?: Rgb;
  font?: 'helvetica' | 'times';
}

const COLORS = {
  forest900: [15, 42, 28],
  forest700: [34, 84, 58],
  forest200: [201, 223, 208],
  forest50: [240, 246, 241],
  gold600: [154, 106, 30],
  gold400: [210, 162, 76],
  cream50: [253, 251, 246],
  ink900: [28, 33, 30],
  ink600: [77, 87, 81],
  ink400: [124, 133, 127],
  border: [228, 220, 203],
  white: [255, 255, 255],
} satisfies Record<string, Rgb>;

const MM_PER_PT = 0.3528;
const MARGIN = 16;
const HEADER_BAND_HEIGHT = 38;
/** Where content starts on pages after the first (below the running header). */
const CONTENT_TOP = 22;
const FOOTER_SPACE = 12;
const STOP_INDENT = 14;

export function itineraryPdfFileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `kandy-day-trip-itinerary-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.pdf`;
}

/** Draws the tourist's itinerary as a printable A4 document. */
export function createItineraryPdf(data: ItineraryPdfData): jsPDF {
  return new ItineraryPdfWriter(data).write();
}

class ItineraryPdfWriter {
  private readonly doc = new jsPDF({ unit: 'mm', format: 'a4' });
  private readonly pageWidth = this.doc.internal.pageSize.getWidth();
  private readonly pageHeight = this.doc.internal.pageSize.getHeight();
  private readonly contentWidth = this.pageWidth - MARGIN * 2;
  private readonly bottomLimit = this.pageHeight - MARGIN - FOOTER_SPACE;
  private readonly generatedLabel: string;
  private y = 0;

  constructor(private readonly data: ItineraryPdfData) {
    this.generatedLabel = new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(data.generatedAt);
  }

  write(): jsPDF {
    this.doc.setProperties({
      title: 'Kandy one-day itinerary',
      subject: 'One-day itinerary',
      author: SITE_INFO.name,
      creator: SITE_INFO.name,
    });

    this.drawTitleBand();
    this.drawOverview();
    this.drawStopsTable();
    this.drawStopDetails();
    this.drawDirections();
    this.drawNotes();
    this.drawPageChrome();
    return this.doc;
  }

  // ---- Sections -------------------------------------------------------------------------------

  private drawTitleBand(): void {
    const doc = this.doc;
    this.fill(COLORS.forest700);
    doc.rect(0, 0, this.pageWidth, HEADER_BAND_HEIGHT, 'F');
    this.fill(COLORS.gold400);
    doc.rect(0, HEADER_BAND_HEIGHT, this.pageWidth, 1.2, 'F');

    this.setStyle({ size: 8.5, style: 'bold', color: COLORS.gold400 });
    doc.text(SITE_INFO.name.toUpperCase(), MARGIN, 10, { baseline: 'top', charSpace: 0.4 });

    this.setStyle({ size: 24, style: 'bold', color: COLORS.white, font: 'times' });
    doc.text('One-day itinerary', MARGIN, 15.5, { baseline: 'top' });

    this.setStyle({ size: 9.5, color: COLORS.forest200 });
    doc.text(pdfText(SITE_INFO.tagline), MARGIN, 28.5, { baseline: 'top' });

    const right = this.pageWidth - MARGIN;
    this.setStyle({ size: 8, color: COLORS.forest200 });
    doc.text('GENERATED', right, 10, { baseline: 'top', align: 'right', charSpace: 0.3 });
    this.setStyle({ size: 9.5, style: 'bold', color: COLORS.white });
    doc.text(this.generatedLabel, right, 14.5, { baseline: 'top', align: 'right' });

    this.y = HEADER_BAND_HEIGHT + 10;
  }

  private drawOverview(): void {
    const { start, stops, summary } = this.data;
    this.sectionHeading('Trip overview');

    const stats: [string, string][] = [
      ['Starting point', start.label || 'Not set'],
      ['Stops', `${stops.length} ${stops.length === 1 ? 'stop' : 'stops'}`],
      [
        'Time at attractions',
        summary.totalVisitMinutes > 0
          ? `About ${formatDuration(summary.totalVisitMinutes)}`
          : 'Not available',
      ],
      ['Travel time', 'Shown in Google Maps'],
    ];

    const gap = 4;
    const boxWidth = (this.contentWidth - gap * (stats.length - 1)) / stats.length;
    const padding = 4;
    const label: TextStyle = { size: 7.5, style: 'bold', color: COLORS.gold600 };
    const value: TextStyle = { size: 11, style: 'bold', color: COLORS.forest900 };
    const valueLines = stats.map(([, v]) => this.wrap(v, value, boxWidth - padding * 2));
    const boxHeight =
      padding * 2 +
      this.lineHeight(label.size) +
      1.5 +
      Math.max(...valueLines.map((l) => l.length)) * this.lineHeight(value.size);

    this.ensureSpace(boxHeight);
    stats.forEach(([title], i) => {
      const x = MARGIN + i * (boxWidth + gap);
      this.fill(COLORS.forest50);
      this.stroke(COLORS.forest200);
      this.doc.setLineWidth(0.25);
      this.doc.roundedRect(x, this.y, boxWidth, boxHeight, 2, 2, 'FD');

      this.setStyle(label);
      this.doc.text(title.toUpperCase(), x + padding, this.y + padding, {
        baseline: 'top',
        charSpace: 0.2,
      });
      this.setStyle(value);
      this.doc.text(
        valueLines[i],
        x + padding,
        this.y + padding + this.lineHeight(label.size) + 1.5,
        {
          baseline: 'top',
          lineHeightFactor: 1.35,
        },
      );
    });
    this.y += boxHeight + 5;

    if (summary.stopsWithoutDuration > 0) {
      const n = summary.stopsWithoutDuration;
      this.paragraph(
        `${n} ${n === 1 ? 'stop has' : 'stops have'} no visit-time estimate and ${n === 1 ? 'is' : 'are'} not included in the time at attractions.`,
        { size: 9, style: 'italic', color: COLORS.ink600 },
        { gapAfter: 3 },
      );
    }

    this.paragraph(
      'Route order',
      { size: 9.5, style: 'bold', color: COLORS.ink600 },
      { gapAfter: 1 },
    );
    const route = [
      `Start: ${start.label || 'Starting point'}`,
      ...stops.map((s) => `${s.order}. ${s.attraction.name}`),
    ];
    this.paragraph(route.join('   >   '), { size: 10.5, color: COLORS.ink900 }, { gapAfter: 8 });
  }

  private drawStopsTable(): void {
    this.sectionHeading('Stops at a glance');

    const body: RowInput[] = this.data.stops.map((stop) => [
      String(stop.order),
      pdfText(stop.isFinal ? `${stop.attraction.name}\nFinal stop` : stop.attraction.name),
      pdfText(stop.attraction.categoryName),
      pdfText(stop.attraction.area),
      formatDuration(stop.attraction.estimatedVisitDurationMinutes) || '-',
    ]);

    autoTable(this.doc, {
      startY: this.y,
      margin: { left: MARGIN, right: MARGIN, top: CONTENT_TOP, bottom: MARGIN + FOOTER_SPACE },
      head: [['#', 'Attraction', 'Category', 'Area', 'Est. visit']],
      body,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 9.5,
        cellPadding: { top: 2.6, bottom: 2.6, left: 3, right: 3 },
        textColor: COLORS.ink900,
        lineColor: COLORS.border,
        lineWidth: 0.2,
        valign: 'middle',
      },
      headStyles: {
        fillColor: COLORS.forest700,
        textColor: COLORS.white,
        fontStyle: 'bold',
        lineColor: COLORS.forest700,
      },
      alternateRowStyles: { fillColor: COLORS.cream50 },
      columnStyles: {
        0: { cellWidth: 11, halign: 'center', fontStyle: 'bold', textColor: COLORS.forest700 },
        1: { fontStyle: 'bold' },
        4: { cellWidth: 26 },
      },
    });
    this.y = this.tableEnd() + 10;
  }

  private drawStopDetails(): void {
    this.sectionHeading('Stop details');
    this.data.stops.forEach((stop, i) => this.drawStop(stop, this.data.details[i] ?? null));
  }

  private drawStop(stop: ItineraryStop, details: Attraction | null): void {
    const doc = this.doc;
    const a = stop.attraction;
    const x = MARGIN + STOP_INDENT;
    const width = this.contentWidth - STOP_INDENT;

    this.ensureSpace(34);
    const top = this.y;

    this.fill(COLORS.forest700);
    doc.circle(MARGIN + 5, top + 5, 5, 'F');
    this.setStyle({ size: 11, style: 'bold', color: COLORS.white });
    doc.text(String(stop.order), MARGIN + 5, top + 5.2, { align: 'center', baseline: 'middle' });

    this.paragraph(
      a.name,
      { size: 13.5, style: 'bold', color: COLORS.forest900, font: 'times' },
      { x, width },
    );
    const meta = [a.categoryName, a.area, stop.isFinal ? 'Final stop' : '']
      .filter(Boolean)
      .join('  |  ');
    this.paragraph(meta, { size: 9, style: 'bold', color: COLORS.gold600 }, { x, width });
    this.y = Math.max(this.y, top + 11) + 3;

    const description = details?.description.length ? details.description : [a.shortDescription];
    for (const text of description) {
      this.paragraph(text, { size: 10, color: COLORS.ink900 }, { x, width, gapAfter: 2 });
    }
    if (!details) {
      this.paragraph(
        'Full details for this stop could not be loaded when this PDF was created.',
        { size: 9, style: 'italic', color: COLORS.ink600 },
        { x, width, gapAfter: 2 },
      );
    }

    const facts: [string, string | undefined][] = [
      ['Address', details?.address],
      ['Opening hours', details?.openingHours],
      ['Entrance fee', details?.entranceFee],
      ['Estimated visit', formatDuration(a.estimatedVisitDurationMinutes) || undefined],
      [
        'Location',
        `${a.latitude.toFixed(5)}, ${a.longitude.toFixed(5)}${a.coordinatesApproximate ? ' (approximate)' : ''}`,
      ],
    ];
    const rows: RowInput[] = facts
      .filter((f): f is [string, string] => !!f[1]?.trim())
      .map(([label, value]) => [label, pdfText(value)]);

    this.y += 1;
    autoTable(doc, {
      startY: this.y,
      margin: { left: x, right: MARGIN, top: CONTENT_TOP, bottom: MARGIN + FOOTER_SPACE },
      body: rows,
      theme: 'plain',
      tableLineColor: COLORS.border,
      tableLineWidth: 0.2,
      styles: {
        font: 'helvetica',
        fontSize: 9.5,
        cellPadding: { top: 1.8, bottom: 1.8, left: 3, right: 3 },
        textColor: COLORS.ink900,
      },
      alternateRowStyles: { fillColor: COLORS.cream50 },
      columnStyles: { 0: { cellWidth: 34, fontStyle: 'bold', textColor: COLORS.ink600 } },
    });
    this.y = this.tableEnd() + 4;

    const linkHeight = this.lineHeight(9.5) + 1;
    const tips = details?.visitorTips.filter((t) => t.trim()) ?? [];
    if (tips.length > 0) {
      const tipsHeight =
        this.lineHeight(10) +
        1 +
        tips.reduce((sum, tip) => sum + this.bulletHeight(tip, width), 0) +
        2;
      this.ensureSpace(Math.min(tipsHeight + linkHeight, 60));
      this.paragraph(
        'Visitor tips',
        { size: 10, style: 'bold', color: COLORS.forest700 },
        { x, width, gapAfter: 1 },
      );
      for (const tip of tips) {
        this.bullet(tip, x, width);
      }
      this.y += 2;
    }

    this.ensureSpace(linkHeight);
    this.link('View this place in Google Maps', buildGoogleMapsPlaceUrl(a), x, {
      size: 9.5,
      style: 'bold',
      color: COLORS.forest700,
    });
    this.y += 5;

    this.stroke(COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, this.y, this.pageWidth - MARGIN, this.y);
    this.y += 7;
  }

  private drawDirections(): void {
    const url = this.data.directionsUrl;
    if (!url) {
      return;
    }
    this.ensureSpace(48);
    this.sectionHeading('Directions');
    this.paragraph(
      `Open this link for directions to your ${this.data.stops.length} ${this.data.stops.length === 1 ? 'stop' : 'stops'} in this exact order. Google Maps works out the roads, distance and travel time.`,
      { size: 10, color: COLORS.ink900 },
      { gapAfter: 4 },
    );

    const label = 'Open directions in Google Maps';
    this.setStyle({ size: 10.5, style: 'bold', color: COLORS.white });
    const buttonWidth = this.doc.getTextWidth(label) + 14;
    const buttonHeight = 10;
    this.fill(COLORS.forest700);
    this.doc.roundedRect(MARGIN, this.y, buttonWidth, buttonHeight, 2.5, 2.5, 'F');
    this.doc.text(label, MARGIN + buttonWidth / 2, this.y + buttonHeight / 2 + 0.2, {
      align: 'center',
      baseline: 'middle',
    });
    this.doc.link(MARGIN, this.y, buttonWidth, buttonHeight, { url });
    this.y += buttonHeight + 4;

    const urlStyle: TextStyle = { size: 7.5, color: COLORS.ink400 };
    const lines = this.wrap(url, urlStyle, this.contentWidth);
    const lineHeight = this.lineHeight(urlStyle.size);
    this.ensureSpace(lines.length * lineHeight);
    this.setStyle(urlStyle);
    this.doc.text(lines, MARGIN, this.y, { baseline: 'top', lineHeightFactor: 1.35 });
    this.doc.link(MARGIN, this.y, this.contentWidth, lines.length * lineHeight, { url });
    this.y += lines.length * lineHeight + 8;
  }

  private drawNotes(): void {
    this.ensureSpace(36);
    this.sectionHeading('Good to know');
    const notes = [
      'Visit times, opening hours and entrance fees are demo estimates for planning only. Please confirm them locally before you go.',
      'Travel time between stops is not included above. Leave time for travel, meals and rest.',
      'Locations marked "approximate" are best-effort estimates rather than surveyed points.',
    ];
    for (const note of notes) {
      this.bullet(note, MARGIN, this.contentWidth, COLORS.ink600);
    }
  }

  /** Running header (pages 2+) and footer with page numbers on every page. */
  private drawPageChrome(): void {
    const doc = this.doc;
    const pages = doc.getNumberOfPages();
    const right = this.pageWidth - MARGIN;
    for (let page = 1; page <= pages; page++) {
      doc.setPage(page);

      if (page > 1) {
        this.setStyle({ size: 8.5, style: 'bold', color: COLORS.forest700 });
        doc.text(SITE_INFO.name, MARGIN, 10, { baseline: 'top' });
        this.setStyle({ size: 8, color: COLORS.ink400 });
        doc.text(`One-day itinerary  |  ${this.generatedLabel}`, right, 10, {
          baseline: 'top',
          align: 'right',
        });
        this.stroke(COLORS.gold400);
        doc.setLineWidth(0.4);
        doc.line(MARGIN, 15, right, 15);
      }

      const footerY = this.pageHeight - MARGIN + 2;
      this.stroke(COLORS.border);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, footerY - 4, right, footerY - 4);
      this.setStyle({ size: 8, color: COLORS.ink400 });
      doc.text(`${SITE_INFO.name}  |  Plan your day in Kandy`, MARGIN, footerY, {
        baseline: 'top',
      });
      doc.text(`Page ${page} of ${pages}`, right, footerY, { baseline: 'top', align: 'right' });
    }
  }

  // ---- Drawing helpers -----------------------------------------------------------------------

  private sectionHeading(title: string): void {
    this.ensureSpace(22);
    this.setStyle({ size: 15, style: 'bold', color: COLORS.forest900, font: 'times' });
    this.doc.text(title, MARGIN, this.y, { baseline: 'top' });
    this.y += this.lineHeight(15) + 0.5;
    this.fill(COLORS.gold400);
    this.doc.rect(MARGIN, this.y, 16, 0.9, 'F');
    this.y += 5;
  }

  private paragraph(
    text: string,
    style: TextStyle,
    options: { x?: number; width?: number; gapAfter?: number } = {},
  ): void {
    const x = options.x ?? MARGIN;
    const lines = this.wrap(text, style, options.width ?? this.contentWidth);
    const lineHeight = this.lineHeight(style.size);
    for (const line of lines) {
      this.ensureSpace(lineHeight);
      this.setStyle(style);
      this.doc.text(line, x, this.y, { baseline: 'top' });
      this.y += lineHeight;
    }
    this.y += options.gapAfter ?? 0;
  }

  private bulletHeight(text: string, width: number): number {
    return this.wrap(text, { size: 9.5 }, width - 5).length * this.lineHeight(9.5) + 1.2;
  }

  private bullet(text: string, x: number, width: number, color: Rgb = COLORS.ink900): void {
    const style: TextStyle = { size: 9.5, color };
    const lines = this.wrap(text, style, width - 5);
    const lineHeight = this.lineHeight(style.size);
    this.ensureSpace(lineHeight);
    this.fill(COLORS.gold600);
    this.doc.circle(x + 1.2, this.y + lineHeight / 2 - 0.3, 0.75, 'F');
    for (const line of lines) {
      this.ensureSpace(lineHeight);
      this.setStyle(style);
      this.doc.text(line, x + 5, this.y, { baseline: 'top' });
      this.y += lineHeight;
    }
    this.y += 1.2;
  }

  private link(label: string, url: string, x: number, style: TextStyle): void {
    this.setStyle(style);
    const width = this.doc.getTextWidth(label);
    const height = this.lineHeight(style.size);
    this.doc.text(label, x, this.y, { baseline: 'top' });
    this.stroke(style.color ?? COLORS.forest700);
    this.doc.setLineWidth(0.25);
    this.doc.line(x, this.y + height - 0.6, x + width, this.y + height - 0.6);
    this.doc.link(x, this.y, width, height, { url });
    this.y += height;
  }

  private ensureSpace(height: number): void {
    if (this.y + height > this.bottomLimit) {
      this.doc.addPage();
      this.y = CONTENT_TOP;
    }
  }

  private wrap(text: string, style: TextStyle, width: number): string[] {
    this.setStyle(style);
    return this.doc.splitTextToSize(pdfText(text), width) as string[];
  }

  private lineHeight(size: number): number {
    return size * MM_PER_PT * 1.35;
  }

  private setStyle(style: TextStyle): void {
    this.doc.setFont(style.font ?? 'helvetica', style.style ?? 'normal');
    this.doc.setFontSize(style.size);
    this.doc.setTextColor(...(style.color ?? COLORS.ink900));
  }

  private fill(color: Rgb): void {
    this.doc.setFillColor(...color);
  }

  private stroke(color: Rgb): void {
    this.doc.setDrawColor(...color);
  }

  private tableEnd(): number {
    return (
      (this.doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? this.y
    );
  }
}

const REPLACEMENTS: [RegExp, string][] = [
  [/[\u2018\u2019\u02BC]/g, "'"],
  [/[\u201C\u201D]/g, '"'],
  [/[\u2013\u2014]/g, '-'],
  [/\u2026/g, '...'],
  [/\u2192/g, '->'],
  [/[\u00A0\u2009\u202F]/g, ' '],
];

/** The built-in PDF fonts only cover Latin-1, so map typographic punctuation to plain equivalents. */
export function pdfText(value: string): string {
  let text = value;
  for (const [pattern, replacement] of REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  return text.replace(/[^\n\x20-\x7E\xA1-\xFF]/g, '');
}
