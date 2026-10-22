import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminDemoAuthService } from '../../../core/services/admin-demo-auth.service';
import { Icon } from '../../../shared/components/icon/icon';
import { Logo } from '../../../shared/components/logo/logo';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './admin-layout.scss',
  template: `
    <div class="admin">
      <header class="admin__bar">
        <div class="container admin__bar-inner">
          <a routerLink="/admin" class="admin__brand">
            <app-logo [size]="34" [inverted]="true" />
            <span>Admin <span class="admin__demo">Demo</span></span>
          </a>
          <nav aria-label="Admin">
            <ul class="admin__nav">
              <li>
                <a
                  routerLink="/admin"
                  routerLinkActive="active"
                  [routerLinkActiveOptions]="{ exact: true }"
                  ariaCurrentWhenActive="page"
                  ><app-icon name="grid" [size]="16" /> Dashboard</a
                >
              </li>
              <li>
                <a
                  routerLink="/admin/attractions"
                  routerLinkActive="active"
                  ariaCurrentWhenActive="page"
                  ><app-icon name="map-pin" [size]="16" /> Attractions</a
                >
              </li>
              <li>
                <a routerLink="/"><app-icon name="eye" [size]="16" /> View site</a>
              </li>
              <li>
                <button type="button" (click)="signOut()">
                  <app-icon name="logout" [size]="16" /> Sign out
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <div class="admin__banner" role="note">
        <div class="container">
          <app-icon name="info" [size]="16" />
          Demo mode: changes are saved only in this browser’s local storage and are not sent to a
          server. The sign-in is not real authentication.
        </div>
      </div>
      <main class="container admin__main">
        <router-outlet />
      </main>
    </div>
  `,
})
export default class AdminLayout {
  private readonly auth = inject(AdminDemoAuthService);
  private readonly router = inject(Router);

  protected signOut(): void {
    this.auth.signOut();
    this.router.navigateByUrl('/admin/login');
  }
}
