import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';

/** Navigation convenience only: the Web API enforces admin authorization on every request. */
export const adminAuthGuard: CanActivateFn = (_route, state) => {
  if (inject(AdminAuthService).isSignedIn()) {
    return true;
  }
  return inject(Router).createUrlTree(['/admin/login'], {
    queryParams: { returnUrl: state.url },
  });
};
