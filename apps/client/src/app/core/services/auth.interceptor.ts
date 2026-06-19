import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService as Auth0AngularService } from '@auth0/auth0-angular';
import { Observable, from, switchMap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

const AUTH_ERRORS = ['login_required', 'consent_required', 'missing_refresh_token', 'invalid_grant'];

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const auth0 = inject(Auth0AngularService);
  const router = inject(Router);

  return from(auth0.getAccessTokenSilently({
    authorizationParams: { audience: environment.auth0.audience },
  })).pipe(
    switchMap((token) => {
      if (token) {
        const authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
        return next(authReq);
      }
      return next(req);
    }),
    catchError((err) => {
      if (AUTH_ERRORS.includes(err.error)) {
        router.navigate(['/auth/login']);
        return throwError(() => err);
      }
      return next(req);
    }),
  );
};

export const errorInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        router.navigate(['/auth/login']);
      }
      return throwError(() => error);
    }),
  );
};
