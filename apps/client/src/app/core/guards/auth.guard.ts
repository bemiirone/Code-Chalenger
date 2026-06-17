import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService as Auth0AngularService } from '@auth0/auth0-angular';
import { combineLatest, map, take, filter } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const auth0 = inject(Auth0AngularService);
  const router = inject(Router);

  return combineLatest([auth0.isAuthenticated$, auth0.isLoading$]).pipe(
    filter(([_, isLoading]) => !isLoading),
    take(1),
    map(([isAuthenticated]) => {
      if (isAuthenticated) return true;
      return router.createUrlTree(['/auth/login']);
    }),
  );
};
