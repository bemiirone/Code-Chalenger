import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { Difficulty } from '@code-challenger/shared';

interface SessionConfig {
  language: string;
  label: string;
  difficulty: Difficulty;
}

const CONFIGS: SessionConfig[] = [
  { language: 'angular-ts', label: 'Angular (v19)', difficulty: 'Easy' },
  { language: 'angular-ts', label: 'Angular (v19)', difficulty: 'Medium' },
  { language: 'angular-ts', label: 'Angular (v19)', difficulty: 'Hard' },
  { language: 'typescript', label: 'TypeScript', difficulty: 'Easy' },
  { language: 'typescript', label: 'TypeScript', difficulty: 'Medium' },
  { language: 'typescript', label: 'TypeScript', difficulty: 'Hard' },
];

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-[#1e1e1e] p-6">
      <header class="flex items-center justify-between mb-8">
        <h1 class="text-2xl font-bold text-white">Code Challenger</h1>
        <div class="flex items-center gap-4">
          <span class="text-[#9d9d9d] text-sm">{{ auth.currentUser()?.displayName }}</span>
          <button (click)="auth.logout()"
            class="text-sm text-[#9d9d9d] hover:text-white border border-[#3c3c3c] px-3 py-1 rounded">
            Logout
          </button>
        </div>
      </header>

      <section>
        <h2 class="text-lg font-semibold text-white mb-4">Start a Challenge Session</h2>
        <p class="text-[#9d9d9d] text-sm mb-6">Each session contains 5 random challenges. Your code is scored by AI.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (cfg of configs; track cfg.label + cfg.difficulty) {
            <button (click)="start(cfg)" [disabled]="loading()"
              class="flex flex-col items-start p-5 rounded-lg bg-[#252526] border border-[#3c3c3c] hover:border-[#007acc] text-left transition disabled:opacity-50">
              <span class="text-white font-medium">{{ cfg.label }}</span>
              <span class="mt-1 text-sm px-2 py-0.5 rounded" [class]="difficultyClass(cfg.difficulty)">
                {{ cfg.difficulty }}
              </span>
            </button>
          }
        </div>
        @if (error()) {
          <p class="mt-4 text-red-400 text-sm">{{ error() }}</p>
        }
      </section>
    </div>
  `,
})
export class DashboardComponent {
  configs = CONFIGS;
  loading = signal(false);
  error = signal('');

  constructor(
    readonly auth: AuthService,
    private sessions: SessionService,
    private router: Router,
  ) {}

  difficultyClass(d: Difficulty): string {
    return {
      Easy: 'text-green-400 bg-green-900/30',
      Medium: 'text-yellow-400 bg-yellow-900/30',
      Hard: 'text-red-400 bg-red-900/30',
    }[d];
  }

  async start(cfg: SessionConfig) {
    this.loading.set(true);
    this.error.set('');
    try {
      const session = await this.sessions.startSession({ language: cfg.language, difficulty: cfg.difficulty });
      await this.router.navigate(['/challenge', session._id]);
    } catch {
      this.error.set('Could not start session. Make sure challenges exist in the database.');
    } finally {
      this.loading.set(false);
    }
  }
}
