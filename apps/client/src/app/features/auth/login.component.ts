import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  features = [
    { icon: '⚡', label: '5 challenges per session, randomly selected' },
    { icon: '🤖', label: 'Instant AI scoring with actionable feedback' },
    { icon: '📈', label: 'Track progress across Angular v12–v19' },
    { icon: '🔓', label: 'View suggested solutions after each attempt' },
  ];

  constructor(private auth: AuthService) {}

  async submit() {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.login({ email: this.email, password: this.password });
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 401) {
        this.error.set('Invalid email or password.');
      } else if (status === 0 || status == null) {
        this.error.set('Cannot reach the server. Make sure the API is running on port 3000.');
      } else {
        this.error.set(`Login failed (${status}). Please try again.`);
      }
    } finally {
      this.loading.set(false);
    }
  }
}
