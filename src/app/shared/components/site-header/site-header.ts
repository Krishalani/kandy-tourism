import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { TripPlanService } from '../../../core/services/trip-plan.service';
import { Icon } from '../icon/icon';
import { Logo } from '../logo/logo';

interface NavLink {
  label: string;
  path: string;
  exact: boolean;
}

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive, Icon, Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './site-header.scss',
  host: { '(document:keydown.escape)': 'menuOpen.set(false)' },
  template: `
    <header class="header">
      <div class="container header__bar">
        <a routerLink="/" class="brand" aria-label="Kandy Day Trip Planner, home">
          <app-logo [size]="38" />
          <span class="brand__text">
            <span class="brand__name">Kandy</span>
            <span class="brand__sub">Day Trip Planner</span>
          </span>
        </a>

        <nav class="nav" [class.nav--open]="menuOpen()" id="main-navigation" aria-label="Main">
          <ul class="nav__list">
            @for (link of links; track link.path) {
              <li>
                <a
                  class="nav__link"
                  [class.nav__link--plan]="link.path === '/my-plan'"
                  [routerLink]="link.path"
                  routerLinkActive="nav__link--active"
                  [routerLinkActiveOptions]="{ exact: link.exact }"
                  ariaCurrentWhenActive="page"
                >
                  @if (link.path === '/my-plan') {
                    <app-icon name="route" [size]="18" />
                    {{ link.label }}
                    @if (plan.count() > 0) {
                      <span class="count" aria-hidden="true">{{ plan.count() }}</span>
                      <span class="visually-hidden">({{ countLabel() }})</span>
                    }
                  } @else {
                    {{ link.label }}
                  }
                </a>
              </li>
            }
          </ul>
        </nav>

        <div class="header__mobile-actions">
          <a routerLink="/my-plan" class="plan-pill">
            <app-icon name="route" [size]="18" />
            <span class="plan-pill__label">My Plan</span>
            @if (plan.count() > 0) {
              <span class="count" aria-hidden="true">{{ plan.count() }}</span>
              <span class="visually-hidden">({{ countLabel() }})</span>
            }
          </a>
          <button
            type="button"
            class="menu-toggle"
            aria-controls="main-navigation"
            [attr.aria-expanded]="menuOpen()"
            (click)="menuOpen.set(!menuOpen())"
          >
            <app-icon [name]="menuOpen() ? 'x' : 'menu'" [size]="22" />
            <span class="visually-hidden">{{ menuOpen() ? 'Close menu' : 'Open menu' }}</span>
          </button>
        </div>
      </div>
    </header>
  `,
})
export class SiteHeader {
  protected readonly plan = inject(TripPlanService);
  protected readonly menuOpen = signal(false);

  protected readonly links: NavLink[] = [
    { label: 'Home', path: '/', exact: true },
    { label: 'Explore', path: '/explore', exact: false },
    { label: 'My Plan', path: '/my-plan', exact: true },
    { label: 'About', path: '/about', exact: true },
    { label: 'Contact', path: '/contact', exact: true },
  ];

  constructor() {
    const subscription = inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.menuOpen.set(false));
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }

  protected countLabel(): string {
    const count = this.plan.count();
    return count === 1 ? '1 attraction selected' : `${count} attractions selected`;
  }
}
