import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[#1e1e1e]">
      <div class="w-full max-w-md p-8 rounded-lg bg-[#252526] border border-[#3c3c3c]">
        <h1 class="text-2xl font-bold text-white mb-6">Sign In</h1>
        <form (ngSubmit)="submit()" class="space-y-4">
          <div>
            <label class="block text-sm text-[#9d9d9d] mb-1">Email</label>
            <input [(ngModel)]="email" name="email" type="email" required
              class="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-white focus:outline-none focus:border-[#007acc]" />
          </div>
          <div>
            <label class="block text-sm text-[#9d9d9d] mb-1">Password</label>
            <input [(ngModel)]="password" name="password" type="password" required
              class="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-white focus:outline-none focus:border-[#007acc]" />
          </div>
          @if (error()) {
            <p class="text-red-400 text-sm">{{ error() }}</p>
          }
          <button type="submit" [disabled]="loading()"
            class="w-full py-2 px-4 bg-[#007acc] hover:bg-[#1a8ad4] text-white rounded font-medium disabled:opacity-50">
            {{ loading() ? 'Signing in…' : 'Sign In' }}
          </button>
        </form>
        <p class="mt-4 text-center text-[#9d9d9d] text-sm">
          No account? <a routerLink="/auth/register" class="text-[#007acc] hover:underline">Register</a>
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  constructor(private auth: AuthService) {}

  async submit() {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.login({ email: this.email, password: this.password });
    } catch {
      this.error.set('Invalid email or password');
    } finally {
      this.loading.set(false);
    }
  }
}
