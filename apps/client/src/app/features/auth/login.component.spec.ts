import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let authMock: { login: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authMock = { login: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authMock },
        provideRouter([]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  describe('submit', () => {
    it('calls auth.login with email and password', async () => {
      authMock.login.mockResolvedValue(undefined);
      component.email = 'test@test.com';
      component.password = 'password123';
      await component.submit();
      expect(authMock.login).toHaveBeenCalledWith({ email: 'test@test.com', password: 'password123' });
    });

    it('sets loading to true during the call and false after', async () => {
      let capturedLoading = false;
      authMock.login.mockImplementation(async () => {
        capturedLoading = component.loading();
      });
      await component.submit();
      expect(capturedLoading).toBe(true);
      expect(component.loading()).toBe(false);
    });

    it('clears the error before each attempt', async () => {
      authMock.login.mockRejectedValue({ status: 401 });
      await component.submit();
      expect(component.error()).toBeTruthy();

      authMock.login.mockResolvedValue(undefined);
      await component.submit();
      expect(component.error()).toBe('');
    });

    it('sets invalid-credentials message for 401', async () => {
      authMock.login.mockRejectedValue({ status: 401 });
      await component.submit();
      expect(component.error()).toBe('Invalid email or password.');
    });

    it('sets server-unreachable message for status 0', async () => {
      authMock.login.mockRejectedValue({ status: 0 });
      await component.submit();
      expect(component.error()).toContain('Cannot reach the server');
    });

    it('sets server-unreachable message for null status', async () => {
      authMock.login.mockRejectedValue({ status: null });
      await component.submit();
      expect(component.error()).toContain('Cannot reach the server');
    });

    it('sets generic error message for other HTTP status codes', async () => {
      authMock.login.mockRejectedValue({ status: 500 });
      await component.submit();
      expect(component.error()).toContain('500');
    });
  });
});
