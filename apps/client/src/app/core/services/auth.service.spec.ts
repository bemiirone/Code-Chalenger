import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService as Auth0AngularService } from '@auth0/auth0-angular';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let auth0Mock: Partial<Auth0AngularService>;
  let router: Router;

  beforeEach(() => {
    auth0Mock = {
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
      isAuthenticated$: of(false),
      user$: of(null),
      isLoading$: of(false),
      error$: of(null),
      getAccessTokenSilently: () => of(''),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Auth0AngularService, useValue: auth0Mock },
      ],
    });

    service = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  describe('initial state', () => {
    it('isAuthenticated is false by default', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('currentUser is null', () => {
      expect(service.currentUser()).toBeNull();
    });
  });

  describe('login', () => {
    it('calls loginWithRedirect with appState', () => {
      service.login();
      expect(auth0Mock.loginWithRedirect).toHaveBeenCalledWith({
        appState: { target: '/dashboard' },
      });
    });
  });

  describe('logout', () => {
    it('calls logout with returnTo', () => {
      service.logout();
      expect(auth0Mock.logout).toHaveBeenCalledWith({
        logoutParams: {
          returnTo: window.location.origin,
        },
      });
    });
  });
});
