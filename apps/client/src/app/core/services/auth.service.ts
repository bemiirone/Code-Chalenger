import { Injectable, inject, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService as Auth0AngularService } from '@auth0/auth0-angular';
import { User } from '@code-challenger/shared';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth0 = inject(Auth0AngularService);
  private router = inject(Router);

  private _user = signal<User | null>(null);
  private _isAuthenticated = signal(false);

  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly currentUser = this._user.asReadonly();

  constructor() {
    effect(() => {
      if (this._isAuthenticated()) {
        this.auth0.user$.subscribe((user) => {
          if (user) {
            this._user.set({
              _id: user.sub || '',
              email: user.email || '',
              displayName: user.name || '',
              createdAt: new Date(),
            });
          }
        });
      }
    });

    this.auth0.isAuthenticated$.subscribe((isAuthenticated) => {
      this._isAuthenticated.set(isAuthenticated);
    });
  }

  login(): void {
    this.auth0.loginWithRedirect({
      appState: { target: '/dashboard' },
    });
  }

  logout(): void {
    this.auth0.logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }

  handleAuthCallback(): void {
    this.auth0.isAuthenticated$.subscribe((isAuthenticated) => {
      if (isAuthenticated) {
        this.router.navigate(['/dashboard']);
      }
    });
  }
}
