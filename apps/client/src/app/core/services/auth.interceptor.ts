import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService as Auth0AngularService } from '@auth0/auth0-angular';
import { Observable, from, switchMap, catchError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const auth0 = inject(Auth0AngularService);

  return from(auth0.getAccessTokenSilently()).pipe(
    switchMap((token) => {
      if (token) {
        const authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
        return next(authReq);
      }
      return next(req);
    }),
    catchError(() => next(req)),
  );
};
