import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { apiErrorCode, apiErrorMessage } from '../../../core/api/api';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { Icon } from '../../../shared/components/icon/icon';
import { Logo } from '../../../shared/components/logo/logo';

@Component({
  selector: 'app-admin-login',
  imports: [ReactiveFormsModule, RouterLink, Icon, Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './admin-login.scss',
  templateUrl: './admin-login.html',
})
export default class AdminLogin {
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly sessionExpired = this.route.snapshot.queryParamMap.get('reason') === 'expired';
  protected readonly error = signal('');
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
    password: ['', [Validators.required, Validators.maxLength(200)]],
  });

  protected submit(): void {
    this.submitted.set(true);
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.auth.signIn(email, password).subscribe({
      next: () => {
        this.submitting.set(false);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const safeReturn =
          returnUrl?.startsWith('/admin') && !returnUrl.startsWith('/admin/login')
            ? returnUrl
            : '/admin';
        void this.router.navigateByUrl(safeReturn);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.form.controls.password.reset();
        this.error.set(
          apiErrorCode(error) === 'invalid-credentials'
            ? 'The email or password is incorrect.'
            : apiErrorMessage(error, 'Sign-in failed. Please try again.'),
        );
      },
    });
  }
}
