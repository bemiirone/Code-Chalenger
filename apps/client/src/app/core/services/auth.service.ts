import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthResponse, LoginDto, RegisterDto, User } from '@code-challenger/shared';

const API = '/api';
const TOKEN_KEY = 'cc_token';
const USER_KEY = 'cc_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private _user = signal<User | null>(JSON.parse(localStorage.getItem(USER_KEY) ?? 'null'));

  readonly isAuthenticated = computed(() => !!this._token());
  readonly currentUser = this._user.asReadonly();
  readonly token = this._token.asReadonly();

  constructor(private http: HttpClient, private router: Router) {
    if (this._token() && !this._user()) {
      firstValueFrom(
        this.http.get<User>(`${API}/auth/me`),
      ).then((user) => {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this._user.set(user);
      }).catch(() => {});
    }
  }

  async register(dto: RegisterDto): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<AuthResponse>(`${API}/auth/register`, dto),
    );
    this.setSession(res);
    await this.router.navigate(['/dashboard']);
  }

  async login(dto: LoginDto): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<AuthResponse>(`${API}/auth/login`, dto),
    );
    this.setSession(res);
    await this.router.navigate(['/dashboard']);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/auth/login']);
  }

  private setSession(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this._token.set(res.access_token);
    this._user.set(res.user as User);
  }
}
