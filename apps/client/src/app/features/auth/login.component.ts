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
  template: `
    <div class="min-h-screen flex">

      <!-- Left branding panel -->
      <div class="hidden lg:flex w-1/2 flex-col justify-between px-16 py-12
                  bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#1a1a2e]
                  border-r border-[#30363d]">
        <!-- Logo -->
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded bg-[#007acc] flex items-center justify-center text-white font-bold text-sm">CC</div>
          <span class="text-white font-semibold tracking-wide">Code Challenger</span>
        </div>

        <!-- Hero text -->
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#007acc]/10 border border-[#007acc]/30 text-[#007acc] text-xs font-medium mb-6">
            <span class="w-1.5 h-1.5 rounded-full bg-[#007acc] animate-pulse"></span>
            AI-Powered Scoring
          </div>
          <h1 class="text-4xl font-bold text-white leading-tight mb-4">
            Challenge yourself.<br/>Level up.
          </h1>
          <p class="text-[#8b949e] text-lg leading-relaxed">
            Practice real-world Angular and TypeScript challenges, scored instantly by AI with detailed feedback.
          </p>

          <!-- Feature list -->
          <ul class="mt-8 space-y-3">
            @for (f of features; track f.label) {
              <li class="flex items-center gap-3 text-[#8b949e] text-sm">
                <span class="text-[#007acc] text-base">{{ f.icon }}</span>
                {{ f.label }}
              </li>
            }
          </ul>
        </div>

        <!-- Footer -->
        <p class="text-[#484f58] text-xs">Angular v12–v19 · TypeScript · AI grading</p>
      </div>

      <!-- Right form panel -->
      <div class="flex-1 flex items-center justify-center px-6 py-12 bg-[#0d1117]">
        <div class="w-full max-w-sm">

          <!-- Mobile logo -->
          <div class="flex items-center gap-2 mb-8 lg:hidden">
            <div class="w-7 h-7 rounded bg-[#007acc] flex items-center justify-center text-white font-bold text-xs">CC</div>
            <span class="text-white font-semibold">Code Challenger</span>
          </div>

          <h2 class="text-2xl font-bold text-white mb-1">Welcome back</h2>
          <p class="text-[#8b949e] text-sm mb-8">Sign in to continue your practice sessions.</p>

          <form (ngSubmit)="submit()" class="space-y-5">

            <div>
              <label class="block text-sm font-medium text-[#cdd9e5] mb-1.5">Email</label>
              <input [(ngModel)]="email" name="email" type="email" required
                placeholder="you@example.com"
                class="w-full px-4 py-3 bg-[#161b22] border border-[#30363d] rounded-lg text-white
                       placeholder-[#484f58] text-sm
                       focus:outline-none focus:border-[#007acc] focus:ring-1 focus:ring-[#007acc]
                       transition-colors duration-150" />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="block text-sm font-medium text-[#cdd9e5]">Password</label>
              </div>
              <input [(ngModel)]="password" name="password" type="password" required
                placeholder="••••••••"
                class="w-full px-4 py-3 bg-[#161b22] border border-[#30363d] rounded-lg text-white
                       placeholder-[#484f58] text-sm
                       focus:outline-none focus:border-[#007acc] focus:ring-1 focus:ring-[#007acc]
                       transition-colors duration-150" />
            </div>

            @if (error()) {
              <div class="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <span class="text-red-400 text-sm">⚠</span>
                <p class="text-red-400 text-sm">{{ error() }}</p>
              </div>
            }

            <button type="submit" [disabled]="loading()"
              class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg
                     bg-gradient-to-r from-[#007acc] to-[#0098ff]
                     hover:brightness-110 active:brightness-95
                     text-white font-medium text-sm
                     disabled:opacity-60 disabled:cursor-not-allowed
                     transition-all duration-150 shadow-lg shadow-[#007acc]/20">
              @if (loading()) {
                <span class="spinner"></span>
                Signing in…
              } @else {
                Sign In
              }
            </button>
          </form>

          <p class="mt-6 text-center text-[#8b949e] text-sm">
            No account?
            <a routerLink="/auth/register" class="text-[#007acc] hover:text-[#3ab4ff] font-medium transition-colors">
              Create one free
            </a>
          </p>
        </div>
      </div>

    </div>
  `,
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
