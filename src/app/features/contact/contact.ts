import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { apiErrorMessage, apiProblem, hasStatus } from '../../core/api/api';
import { ContactService } from '../../core/services/contact.service';
import { SiteInfoService } from '../../core/services/site-info.service';
import { Icon } from '../../shared/components/icon/icon';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type FieldName = 'name' | 'email' | 'subject' | 'message';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './contact.scss',
  templateUrl: './contact.html',
})
export default class Contact {
  protected readonly site = inject(SiteInfoService);
  private readonly contacts = inject(ContactService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: [
      '',
      [Validators.required, Validators.pattern(EMAIL_PATTERN), Validators.maxLength(120)],
    ],
    subject: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
  });

  protected readonly submitted = signal(false);
  protected readonly sending = signal(false);
  protected readonly sendError = signal('');
  protected readonly sent = signal<{ name: string; email: string } | null>(null);

  protected showError(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.submitted());
  }

  protected submit(): void {
    this.submitted.set(true);
    this.sendError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    const value = this.form.getRawValue();
    const request = {
      name: value.name.trim(),
      email: value.email.trim(),
      subject: value.subject.trim(),
      message: value.message.trim(),
    };
    this.sending.set(true);
    this.contacts
      .send(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.sent.set({ name: request.name, email: request.email });
          this.form.reset();
          this.submitted.set(false);
          afterNextRender(
            () => this.host.nativeElement.querySelector<HTMLElement>('#contact-success')?.focus(),
            { injector: this.injector },
          );
        },
        error: (error: unknown) => {
          this.sending.set(false);
          if (this.applyServerErrors(apiProblem(error)?.errors)) {
            this.focusFirstInvalid();
            return;
          }
          this.sendError.set(
            hasStatus(error, 429)
              ? (apiProblem(error)?.detail ?? 'Please wait a few minutes and try again.')
              : apiErrorMessage(error, 'Your message couldn’t be sent. Please try again.'),
          );
        },
      });
  }

  protected sendAnother(): void {
    this.sent.set(null);
  }

  /** Shows the API's field messages next to the matching inputs; returns whether any matched. */
  private applyServerErrors(errors: Record<string, string[]> | undefined): boolean {
    let matched = false;
    for (const [field, messages] of Object.entries(errors ?? {})) {
      const control = this.form.controls[field as FieldName];
      if (control && messages.length > 0) {
        control.setErrors({ server: messages[0] });
        control.markAsTouched();
        matched = true;
      }
    }
    return matched;
  }

  private focusFirstInvalid(): void {
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      { injector: this.injector },
    );
  }
}
