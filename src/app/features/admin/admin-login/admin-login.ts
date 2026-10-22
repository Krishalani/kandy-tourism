import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AdminDemoAuthService,
  DEMO_ADMIN_CREDENTIALS,
} from '../../../core/services/admin-demo-auth.service';
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
  private readonly auth = inject(AdminDemoAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly demo = DEMO_ADMIN_CREDENTIALS;
  protected readonly failed = signal(false);
  protected readonly submitted = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  protected fillDemo(): void {
    this.form.setValue({ username: this.demo.username, password: this.demo.password });
  }

  protected submit(): void {
    this.submitted.set(true);
    this.failed.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { username, password } = this.form.getRawValue();
    if (!this.auth.signIn(username, password)) {
      this.failed.set(true);
      return;
    }
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const safeReturn = returnUrl?.startsWith('/admin') ? returnUrl : '/admin';
    this.router.navigateByUrl(safeReturn);
  }
}
