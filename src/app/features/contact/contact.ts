import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { SiteInfoService } from '../../core/services/site-info.service';
import { Icon } from '../../shared/components/icon/icon';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './contact.scss',
  templateUrl: './contact.html',
})
export default class Contact {
  protected readonly site = inject(SiteInfoService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    email: [
      '',
      [Validators.required, Validators.pattern(EMAIL_PATTERN), Validators.maxLength(120)],
    ],
    subject: ['', [Validators.required, Validators.maxLength(120)]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
  });

  protected readonly submitted = signal(false);
  protected readonly sentTo = signal<string | null>(null);

  protected showError(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.submitted());
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      afterNextRender(
        () => this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
        { injector: this.injector },
      );
      return;
    }
    // Frontend demonstration only: nothing is sent anywhere.
    this.sentTo.set(this.form.getRawValue().name.trim());
    this.form.reset();
    this.submitted.set(false);
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>('#contact-success')?.focus(),
      { injector: this.injector },
    );
  }

  protected sendAnother(): void {
    this.sentTo.set(null);
  }
}
