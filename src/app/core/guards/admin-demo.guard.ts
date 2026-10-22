import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminDemoAuthService } from '../services/admin-demo-auth.service';

/** Navigation convenience for the admin demo only. It does not protect any data. */
export const adminDemoGuard: CanActivateFn = (_route, state) => {
  if (inject(AdminDemoAuthService).isSignedIn()) {
    return true;
  }
  return inject(Router).createUrlTree(['/admin/login'], {
    queryParams: { returnUrl: state.url },
  });
};
