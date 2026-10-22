import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteInfoService } from '../../../core/services/site-info.service';
import { Icon } from '../icon/icon';
import { Logo } from '../logo/logo';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, Icon, Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './site-footer.scss',
  template: `
    @let site = siteInfo.info;
    <footer class="footer">
      <div class="container footer__grid">
        <div class="footer__brand">
          <a routerLink="/" class="footer__logo">
            <app-logo [size]="40" [inverted]="true" />
            <span>{{ site.name }}</span>
          </a>
          <p>{{ site.description }}</p>
          <p class="footer__note">
            <span class="footer__tag">Prototype</span>
            Attraction details, hours and fees are demo data and should be checked locally before
            you travel.
          </p>
        </div>

        <nav class="footer__col" aria-label="Plan your trip">
          <h2 class="footer__heading">Plan your trip</h2>
          <ul>
            <li><a routerLink="/">Home</a></li>
            <li><a routerLink="/explore">Explore attractions</a></li>
            <li><a routerLink="/my-plan">My Plan</a></li>
          </ul>
        </nav>

        <nav class="footer__col" aria-label="About this site">
          <h2 class="footer__heading">About</h2>
          <ul>
            <li><a routerLink="/about">About Kandy</a></li>
            <li><a routerLink="/contact">Contact</a></li>
            <li><a routerLink="/admin">Admin demo</a></li>
          </ul>
        </nav>

        <div class="footer__col">
          <h2 class="footer__heading">Contact <span class="footer__tag">Demo details</span></h2>
          <ul class="footer__contact">
            <li><app-icon name="mail" [size]="16" /> {{ site.contact.email }}</li>
            <li><app-icon name="phone" [size]="16" /> {{ site.contact.phone }}</li>
            <li><app-icon name="map-pin" [size]="16" /> {{ site.contact.address }}</li>
          </ul>
        </div>
      </div>

      <div class="container footer__bottom">
        <p>© {{ year }} {{ site.name }}. A prototype for planning purposes only.</p>
        <p>
          Photos from
          <a href="https://commons.wikimedia.org" target="_blank" rel="noopener"
            >Wikimedia Commons</a
          >
          contributors. Map data ©
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener"
            >OpenStreetMap</a
          >
          contributors.
        </p>
      </div>
    </footer>
  `,
})
export class SiteFooter {
  protected readonly siteInfo = inject(SiteInfoService);
  protected readonly year = new Date().getFullYear();
}
