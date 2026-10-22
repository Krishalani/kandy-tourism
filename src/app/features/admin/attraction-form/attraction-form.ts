import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import {
  ATTRACTION_CATEGORIES,
  Attraction,
  AttractionCategory,
  AttractionDraft,
} from '../../../core/models/attraction.model';
import { AttractionService } from '../../../core/services/attraction.service';
import { ToastService } from '../../../core/services/toast.service';
import { toLoadState } from '../../../core/utils/load-state';
import { Icon } from '../../../shared/components/icon/icon';
import { EmptyState } from '../../../shared/components/state/empty-state';
import { ImgFallbackDirective } from '../../../shared/directives/img-fallback.directive';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE_URL_PATTERN = /^(https:\/\/\S+|\/\S+)$/;

/** Rough bounding box for Sri Lanka, to catch swapped or mistyped coordinates. */
const LAT_RANGE = { min: 5.8, max: 10 };
const LNG_RANGE = { min: 79.4, max: 82 };

type FieldName =
  | 'name'
  | 'slug'
  | 'category'
  | 'shortDescription'
  | 'description'
  | 'imageUrl'
  | 'imageAlt'
  | 'address'
  | 'area'
  | 'latitude'
  | 'longitude'
  | 'estimatedVisitDurationMinutes';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const splitLines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

@Component({
  selector: 'app-attraction-form',
  imports: [
    ReactiveFormsModule,
    NgTemplateOutlet,
    RouterLink,
    Icon,
    EmptyState,
    ImgFallbackDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './attraction-form.scss',
  templateUrl: './attraction-form.html',
})
export default class AttractionForm {
  private readonly attractionService = inject(AttractionService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly categories = ATTRACTION_CATEGORIES;

  /** `undefined` while adding; the record (or null if missing) while editing. */
  protected readonly existing = toLoadState(
    inject(ActivatedRoute).paramMap.pipe(
      map((params) => params.get('id')),
      switchMap((id) =>
        id
          ? this.attractionService.getAttractionById(id).pipe(map((a) => a ?? null))
          : of(undefined),
      ),
    ),
  );

  protected readonly isEdit = computed(() => {
    const state = this.existing();
    return state.status === 'ready' && state.data !== undefined;
  });

  protected readonly notFound = computed(() => {
    const state = this.existing();
    return state.status === 'ready' && state.data === null;
  });

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    slug: ['', [Validators.required, Validators.pattern(SLUG_PATTERN), Validators.maxLength(80)]],
    category: ['' as AttractionCategory | '', Validators.required],
    shortDescription: ['', [Validators.required, Validators.maxLength(220)]],
    description: ['', [Validators.required, Validators.minLength(20)]],
    imageUrl: ['', [Validators.required, Validators.pattern(IMAGE_URL_PATTERN)]],
    imageAlt: ['', [Validators.required, Validators.maxLength(200)]],
    galleryUrls: [''],
    address: ['', [Validators.required, Validators.maxLength(160)]],
    area: ['', [Validators.required, Validators.maxLength(80)]],
    latitude: [
      null as number | null,
      [Validators.required, Validators.min(LAT_RANGE.min), Validators.max(LAT_RANGE.max)],
    ],
    longitude: [
      null as number | null,
      [Validators.required, Validators.min(LNG_RANGE.min), Validators.max(LNG_RANGE.max)],
    ],
    coordinatesApproximate: [true],
    estimatedVisitDurationMinutes: [
      null as number | null,
      [Validators.min(5), Validators.max(720)],
    ],
    openingHours: [''],
    entranceFee: [''],
    visitorTips: [''],
    tags: [''],
    featured: [false],
  });

  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal('');

  protected readonly imagePreview = toSignal(this.form.controls.imageUrl.valueChanges, {
    initialValue: '',
  });

  private slugEditedManually = false;
  private loadedId: string | null = null;

  constructor() {
    effect(() => {
      const state = this.existing();
      if (state.status === 'ready' && state.data && state.data.id !== this.loadedId) {
        this.loadedId = state.data.id;
        this.slugEditedManually = true;
        this.patch(state.data);
      }
    });

    this.form.controls.name.valueChanges.subscribe((name) => {
      if (!this.slugEditedManually) {
        this.form.controls.slug.setValue(slugify(name), { emitEvent: false });
      }
    });
  }

  protected onSlugInput(): void {
    this.slugEditedManually = true;
  }

  protected showError(field: FieldName): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  protected errorMessage(field: FieldName): string {
    const errors = this.form.controls[field].errors ?? {};
    if (errors['required']) {
      return 'This field is required.';
    }
    if (errors['taken']) {
      return 'Another attraction already uses this URL slug.';
    }
    if (errors['pattern']) {
      return field === 'slug'
        ? 'Use lowercase letters, numbers and single hyphens, e.g. kandy-lake.'
        : 'Enter an https:// URL or a path starting with /.';
    }
    if (errors['min'] || errors['max']) {
      if (field === 'latitude') {
        return `Latitude should be between ${LAT_RANGE.min} and ${LAT_RANGE.max} for Sri Lanka.`;
      }
      if (field === 'longitude') {
        return `Longitude should be between ${LNG_RANGE.min} and ${LNG_RANGE.max} for Sri Lanka.`;
      }
      return 'Enter a visit time between 5 and 720 minutes.';
    }
    if (errors['maxlength']) {
      return `Please keep this under ${errors['maxlength'].requiredLength} characters.`;
    }
    if (errors['minlength']) {
      return 'Please write a little more.';
    }
    return 'Please check this value.';
  }

  protected submit(): void {
    this.submitted.set(true);
    this.saveError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    const draft = this.toDraft();
    const editingId = this.loadedId ?? undefined;
    this.saving.set(true);

    this.attractionService
      .isSlugAvailable(draft.slug, editingId)
      .pipe(
        switchMap((available) => {
          if (!available) {
            throw new Error('slug-taken');
          }
          return editingId
            ? this.attractionService.updateAttraction(editingId, draft)
            : this.attractionService.createAttraction(draft);
        }),
      )
      .subscribe({
        next: (saved) => {
          this.saving.set(false);
          this.toast.show(
            `${saved.name} was ${editingId ? 'updated' : 'added'} in the demo data (this browser only).`,
          );
          this.router.navigateByUrl('/admin/attractions');
        },
        error: (error: Error) => {
          this.saving.set(false);
          if (error.message === 'slug-taken') {
            this.form.controls.slug.setErrors({ taken: true });
            this.focusFirstInvalid();
          } else {
            this.saveError.set(error.message || 'The attraction could not be saved.');
          }
        },
      });
  }

  private patch(a: Attraction): void {
    this.form.setValue({
      name: a.name,
      slug: a.slug,
      category: a.category,
      shortDescription: a.shortDescription,
      description: a.description.join('\n\n'),
      imageUrl: a.imageUrl,
      imageAlt: a.imageAlt,
      galleryUrls: a.gallery.map((g) => g.url).join('\n'),
      address: a.address,
      area: a.area,
      latitude: a.latitude,
      longitude: a.longitude,
      coordinatesApproximate: a.coordinatesApproximate,
      estimatedVisitDurationMinutes: a.estimatedVisitDurationMinutes ?? null,
      openingHours: a.openingHours ?? '',
      entranceFee: a.entranceFee ?? '',
      visitorTips: a.visitorTips.join('\n'),
      tags: a.tags.join(', '),
      featured: a.featured,
    });
  }

  private toDraft(): AttractionDraft {
    const v = this.form.getRawValue();
    const state = this.existing();
    const previous = state.status === 'ready' ? state.data : undefined;
    const name = v.name.trim();
    const galleryUrls = splitLines(v.galleryUrls).filter((url) => IMAGE_URL_PATTERN.test(url));

    return {
      name,
      slug: v.slug.trim(),
      category: v.category as AttractionCategory,
      shortDescription: v.shortDescription.trim(),
      description: v.description
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean),
      imageUrl: v.imageUrl.trim(),
      imageAlt: v.imageAlt.trim(),
      imageCredit:
        previous && previous.imageUrl === v.imageUrl.trim() ? previous.imageCredit : undefined,
      gallery: galleryUrls.map((url, i) => {
        const match = previous?.gallery.find((g) => g.url === url);
        return match ?? { url, alt: `${name}, photo ${i + 2}` };
      }),
      address: v.address.trim(),
      area: v.area.trim(),
      latitude: Number(v.latitude),
      longitude: Number(v.longitude),
      coordinatesApproximate: v.coordinatesApproximate,
      estimatedVisitDurationMinutes: v.estimatedVisitDurationMinutes ?? undefined,
      openingHours: v.openingHours.trim() || undefined,
      entranceFee: v.entranceFee.trim() || undefined,
      visitorTips: splitLines(v.visitorTips),
      tags: v.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      featured: v.featured,
    };
  }

  private focusFirstInvalid(): void {
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      { injector: this.injector },
    );
  }
}
