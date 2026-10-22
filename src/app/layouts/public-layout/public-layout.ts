import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SiteFooter } from '../../shared/components/site-footer/site-footer';
import { SiteHeader } from '../../shared/components/site-header/site-header';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    main {
      flex: 1;
    }
    main:focus {
      outline: none;
    }
  `,
  template: `
    <a class="skip-link" href="#main-content" (click)="skipToMain($event)">Skip to main content</a>
    <app-site-header />
    <main id="main-content" tabindex="-1" #main>
      <router-outlet />
    </main>
    <app-site-footer />
  `,
})
export class PublicLayout {
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  constructor() {
    // Move focus to the new page content when the path changes (not for query-only
    // changes such as Explore filters), so keyboard and screen-reader users start at the top.
    let previousPath: string | null = null;
    const subscription = inject(Router)
      .events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((event) => {
        const path = event.urlAfterRedirects.split(/[?#]/)[0];
        if (previousPath !== null && path !== previousPath) {
          this.main().nativeElement.focus({ preventScroll: true });
        }
        previousPath = path;
      });
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }

  /** With `<base href="/">`, a plain "#main-content" link would navigate to the home page. */
  protected skipToMain(event: Event): void {
    event.preventDefault();
    this.main().nativeElement.focus();
  }
}
