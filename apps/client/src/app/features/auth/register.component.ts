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
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  displayName = '';
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  stats = [
    { value: '500+', label: 'Challenges' },
    { value: '8', label: 'Angular versions' },
    { value: 'AI', label: 'Instant scoring' },
  ];

  constructor(private auth: AuthService) {}

  async submit() {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.register({ email: this.email, password: this.password, displayName: this.displayName });
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        this.error.set('That email is already registered. Try signing in instead.');
      } else if (status === 0 || status == null) {
        this.error.set('Cannot reach the server. Make sure the API is running on port 3000.');
      } else {
        this.error.set(`Registration failed (${status}). Please try again.`);
      }
    } finally {
      this.loading.set(false);
    }
  }
}
