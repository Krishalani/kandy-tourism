import { Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';

export const DEFAULT_IMAGE_FALLBACK = '/images/attraction-placeholder.svg';

/**
 * Replaces a broken image with a local placeholder so layouts never collapse.
 * Also handles images that failed before hydration attached the error listener.
 */
@Directive({
  selector: 'img[appImgFallback]',
  host: {
    '(error)': 'useFallback()',
  },
})
export class ImgFallbackDirective {
  readonly appImgFallback = input<string>('');

  private readonly img = inject<ElementRef<HTMLImageElement>>(ElementRef).nativeElement;
  private applied = false;

  constructor() {
    afterNextRender(() => {
      if (this.img.complete && this.img.naturalWidth === 0 && this.img.currentSrc) {
        this.useFallback();
      }
    });
  }

  protected useFallback(): void {
    if (this.applied) {
      return;
    }
    this.applied = true;
    this.img.src = this.appImgFallback() || DEFAULT_IMAGE_FALLBACK;
    this.img.classList.add('img-fallback');
  }
}
