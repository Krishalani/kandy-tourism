import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

interface Step {
  icon: IconName;
  title: string;
  text: string;
}

@Component({
  selector: 'app-how-it-works',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './how-it-works.scss',
  template: `
    <ol class="steps">
      @for (step of steps; track step.title; let i = $index) {
        <li class="step">
          <span class="step__icon"><app-icon [name]="step.icon" [size]="24" /></span>
          <span class="step__number">Step {{ i + 1 }}</span>
          <h3 class="step__title">{{ step.title }}</h3>
          <p class="step__text">{{ step.text }}</p>
        </li>
      }
    </ol>
  `,
})
export class HowItWorks {
  protected readonly steps: Step[] = [
    {
      icon: 'compass',
      title: 'Explore attractions',
      text: 'Browse temples, gardens, viewpoints and museums in and around Kandy.',
    },
    {
      icon: 'plus',
      title: 'Add your favourite places',
      text: 'Save the places you would like to see to My Plan with a single tap.',
    },
    {
      icon: 'route',
      title: 'Arrange your itinerary',
      text: 'Drag stops or use the arrow buttons to set the exact order you want.',
    },
    {
      icon: 'navigation',
      title: 'View your route and go',
      text: 'Preview the stops on a map, then open the same route in Google Maps.',
    },
  ];
}
