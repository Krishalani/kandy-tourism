import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../shared/components/icon/icon';
import { EmptyState } from '../../shared/components/state/empty-state';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, Icon, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container section">
      <h1 class="visually-hidden">Page not found</h1>
      <app-empty-state
        icon="compass"
        title="This path doesn’t lead anywhere"
        message="The page you’re looking for doesn’t exist or may have moved."
      >
        <a routerLink="/" class="btn btn--primary"><app-icon name="home" [size]="18" /> Go home</a>
        <a routerLink="/explore" class="btn">Explore attractions</a>
      </app-empty-state>
    </div>
  `,
})
export default class NotFound {}
