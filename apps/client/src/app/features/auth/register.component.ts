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
            Free to join
          </div>
          <h1 class="text-4xl font-bold text-white leading-tight mb-4">
            Start your coding<br/>journey today.
          </h1>
          <p class="text-[#8b949e] text-lg leading-relaxed">
            Create a free account and get instant access to 500+ Angular and TypeScript challenges with AI-powered feedback.
          </p>

          <!-- Stats -->
          <div class="mt-10 grid grid-cols-3 gap-6">
            @for (stat of stats; track stat.label) {
              <div>
                <div class="text-2xl font-bold text-white">{{ stat.value }}</div>
                <div class="text-[#8b949e] text-xs mt-0.5">{{ stat.label }}</div>
              </div>
            }
          </div>
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

          <h2 class="text-2xl font-bold text-white mb-1">Create your account</h2>
          <p class="text-[#8b949e] text-sm mb-8">Free forever. No credit card required.</p>

          <form (ngSubmit)="submit()" class="space-y-4">

            <div>
              <label class="block text-sm font-medium text-[#cdd9e5] mb-1.5">Display Name</label>
              <input [(ngModel)]="displayName" name="displayName" type="text" required
                placeholder="John Doe"
                class="w-full px-4 py-3 bg-[#161b22] border border-[#30363d] rounded-lg text-white
                       placeholder-[#484f58] text-sm
                       focus:outline-none focus:border-[#007acc] focus:ring-1 focus:ring-[#007acc]
                       transition-colors duration-150" />
            </div>

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
              <label class="block text-sm font-medium text-[#cdd9e5] mb-1.5">Password</label>
              <input [(ngModel)]="password" name="password" type="password" required minlength="8"
                placeholder="Min. 8 characters"
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
                     transition-all duration-150 shadow-lg shadow-[#007acc]/20 mt-2">
              @if (loading()) {
                <span class="spinner"></span>
                Creating account…
              } @else {
                Create Account
              }
            </button>

            <p class="text-[#484f58] text-xs text-center pt-1">
              By signing up you agree to practice lots of coding.
            </p>
          </form>

          <p class="mt-6 text-center text-[#8b949e] text-sm">
            Already have an account?
            <a routerLink="/auth/login" class="text-[#007acc] hover:text-[#3ab4ff] font-medium transition-colors">
              Sign in
            </a>
          </p>
        </div>
      </div>

    </div>
  `,
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
