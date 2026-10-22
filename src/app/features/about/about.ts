import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteInfoService } from '../../core/services/site-info.service';
import { HowItWorks } from '../../shared/components/how-it-works/how-it-works';
import { Icon } from '../../shared/components/icon/icon';
import { IconName } from '../../shared/components/icon/icons';
import { ImgFallbackDirective } from '../../shared/directives/img-fallback.directive';

interface Feature {
  icon: IconName;
  title: string;
  text: string;
}

@Component({
  selector: 'app-about',
  imports: [RouterLink, Icon, HowItWorks, ImgFallbackDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './about.scss',
  templateUrl: './about.html',
})
export default class About {
  protected readonly site = inject(SiteInfoService);

  protected readonly features: Feature[] = [
    {
      icon: 'compass',
      title: 'Discover what’s nearby',
      text: 'Browse heritage sites, temples, gardens, museums and viewpoints with clear summaries and photos.',
    },
    {
      icon: 'route',
      title: 'Plan in your own order',
      text: 'Choose a starting point and arrange stops exactly how you want. Nothing is reordered without your say-so.',
    },
    {
      icon: 'map',
      title: 'Preview the day',
      text: 'See your stops numbered on a map so the shape of the day is easy to understand at a glance.',
    },
    {
      icon: 'navigation',
      title: 'Navigate with Google Maps',
      text: 'Open the same ordered route in Google Maps for real roads, live travel times and turn-by-turn directions.',
    },
  ];
}
