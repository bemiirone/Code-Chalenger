import { Component, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { AuthService as Auth0AngularService } from '@auth0/auth0-angular';

@Component({
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private auth0 = inject(Auth0AngularService);

  loading = signal(false);
  error = signal('');

  features = [
    { icon: '⚡', label: '5 challenges per session, randomly selected' },
    { icon: '🤖', label: 'Instant AI scoring with actionable feedback' },
    { icon: '📈', label: 'Track progress across Angular v12–v19' },
    { icon: '🔓', label: 'View suggested solutions after each attempt' },
  ];

  constructor() {
    effect(() => {
      this.auth0.isLoading$.subscribe((isLoading) => {
        this.loading.set(isLoading);
      });
    });

    this.auth0.error$.subscribe((err) => {
      if (err) {
        this.error.set(err.message || 'An authentication error occurred.');
      }
    });
  }

  login() {
    this.auth.login();
  }
}
