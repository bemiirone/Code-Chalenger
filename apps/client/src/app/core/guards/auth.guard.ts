import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService as Auth0AngularService } from '@auth0/auth0-angular';
import { map, take } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const auth0 = inject(Auth0AngularService);
  const router = inject(Router);

  return auth0.isAuthenticated$.pipe(
    take(1),
    map((isAuthenticated) => {
      if (isAuthenticated) return true;
      return router.createUrlTree(['/auth/login']);
    }),
  );
};
