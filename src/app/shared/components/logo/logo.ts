import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Brand mark: green hills over Kandy Lake with a gold sun. Decorative. */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }
  `,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 40 40" focusable="false">
      <rect width="40" height="40" rx="11" [attr.fill]="inverted() ? '#f0f6f1' : '#22543a'" />
      <circle cx="28" cy="13" r="4.5" fill="#d2a24c" />
      <path d="M4 27c5-7 9-9 13-6s6 3 9-1 7-4 10 1v8H4z" fill="#3f8460" />
      <path
        d="M4 29c6-4 11-4 16-1s10 2 16-1v6.5A4.5 4.5 0 0 1 31.5 38h-23A4.5 4.5 0 0 1 4 33.5z"
        fill="#173d29"
      />
      <path d="M11 32.5h18" stroke="#c9dfd0" stroke-width="1.6" stroke-linecap="round" />
    </svg>
  `,
})
export class Logo {
  readonly size = input(40);
  readonly inverted = input(false);
}
