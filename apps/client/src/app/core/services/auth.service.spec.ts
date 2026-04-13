import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from './auth.service';

const mockAuthResponse = {
  access_token: 'tok123',
  user: { _id: 'u1', email: 'a@b.com', displayName: 'Alice' },
};

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    // Prevent NG04002 — tests don't need real navigation
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  describe('initial state', () => {
    it('isAuthenticated is false when no token in storage', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('currentUser is null', () => {
      expect(service.currentUser()).toBeNull();
    });
  });

  describe('login', () => {
    it('POSTs to /api/auth/login', async () => {
      const p = service.login({ email: 'a@b.com', password: 'pass' });
      http.expectOne('/api/auth/login').flush(mockAuthResponse);
      await p;
    });

    it('sets isAuthenticated to true', async () => {
      const p = service.login({ email: 'a@b.com', password: 'pass' });
      http.expectOne('/api/auth/login').flush(mockAuthResponse);
      await p;
      expect(service.isAuthenticated()).toBe(true);
    });

    it('saves token to localStorage', async () => {
      const p = service.login({ email: 'a@b.com', password: 'pass' });
      http.expectOne('/api/auth/login').flush(mockAuthResponse);
      await p;
      expect(localStorage.getItem('cc_token')).toBe('tok123');
    });

    it('sets currentUser from response', async () => {
      const p = service.login({ email: 'a@b.com', password: 'pass' });
      http.expectOne('/api/auth/login').flush(mockAuthResponse);
      await p;
      expect(service.currentUser()?.displayName).toBe('Alice');
    });

    it('navigates to /dashboard', async () => {
      const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      const p = service.login({ email: 'a@b.com', password: 'pass' });
      http.expectOne('/api/auth/login').flush(mockAuthResponse);
      await p;
      expect(spy).toHaveBeenCalledWith(['/dashboard']);
    });
  });

  describe('register', () => {
    it('POSTs to /api/auth/register', async () => {
      const p = service.register({ email: 'a@b.com', password: 'pass', displayName: 'Alice' });
      http.expectOne('/api/auth/register').flush(mockAuthResponse);
      await p;
    });

    it('sets isAuthenticated to true', async () => {
      const p = service.register({ email: 'a@b.com', password: 'pass', displayName: 'Alice' });
      http.expectOne('/api/auth/register').flush(mockAuthResponse);
      await p;
      expect(service.isAuthenticated()).toBe(true);
    });

    it('navigates to /dashboard', async () => {
      const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      const p = service.register({ email: 'a@b.com', password: 'pass', displayName: 'Alice' });
      http.expectOne('/api/auth/register').flush(mockAuthResponse);
      await p;
      expect(spy).toHaveBeenCalledWith(['/dashboard']);
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      vi.spyOn(router, 'navigate').mockResolvedValue(true);
    });

    it('clears isAuthenticated', () => {
      service['_token'].set('some-token');
      service.logout();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('clears currentUser', () => {
      service['_user'].set({ _id: 'u1', email: 'a@b.com', displayName: 'Alice' } as never);
      service.logout();
      expect(service.currentUser()).toBeNull();
    });

    it('removes token from localStorage', () => {
      localStorage.setItem('cc_token', 'existing-token');
      service.logout();
      expect(localStorage.getItem('cc_token')).toBeNull();
    });

    it('navigates to /auth/login', () => {
      const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      service.logout();
      expect(spy).toHaveBeenCalledWith(['/auth/login']);
    });
  });
});
