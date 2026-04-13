import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../core/services/auth.service';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let authMock: { register: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authMock = { register: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        { provide: AuthService, useValue: authMock },
        provideRouter([]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  describe('submit', () => {
    it('calls auth.register with all three fields', async () => {
      authMock.register.mockResolvedValue(undefined);
      component.displayName = 'Alice';
      component.email = 'alice@test.com';
      component.password = 'secret123';
      await component.submit();
      expect(authMock.register).toHaveBeenCalledWith({
        email: 'alice@test.com',
        password: 'secret123',
        displayName: 'Alice',
      });
    });

    it('sets loading to true during the call and false after', async () => {
      let capturedLoading = false;
      authMock.register.mockImplementation(async () => {
        capturedLoading = component.loading();
      });
      await component.submit();
      expect(capturedLoading).toBe(true);
      expect(component.loading()).toBe(false);
    });

    it('clears the error before each attempt', async () => {
      authMock.register.mockRejectedValue({ status: 409 });
      await component.submit();
      expect(component.error()).toBeTruthy();

      authMock.register.mockResolvedValue(undefined);
      await component.submit();
      expect(component.error()).toBe('');
    });

    it('sets already-registered message for 409', async () => {
      authMock.register.mockRejectedValue({ status: 409 });
      await component.submit();
      expect(component.error()).toContain('already registered');
    });

    it('sets server-unreachable message for status 0', async () => {
      authMock.register.mockRejectedValue({ status: 0 });
      await component.submit();
      expect(component.error()).toContain('Cannot reach the server');
    });

    it('sets server-unreachable message for null status', async () => {
      authMock.register.mockRejectedValue({ status: null });
      await component.submit();
      expect(component.error()).toContain('Cannot reach the server');
    });

    it('sets generic error message for other HTTP status codes', async () => {
      authMock.register.mockRejectedValue({ status: 422 });
      await component.submit();
      expect(component.error()).toContain('422');
    });
  });
});
