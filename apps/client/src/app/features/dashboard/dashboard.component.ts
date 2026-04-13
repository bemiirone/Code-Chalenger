import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { ChallengesService } from '../../core/services/challenges.service';
import { Difficulty } from '@code-challenger/shared';

interface SessionConfig {
  language: string;
  label: string;
  difficulty: Difficulty;
}

// Display labels for known language codes. Add one line here when seeding a new language.
const LANGUAGE_LABELS: Record<string, string> = {
  'angular-ts': 'Angular (v19)',
  'javascript': 'JavaScript (ES6+)',
  'typescript': 'TypeScript',
  'css3': 'CSS3 (Modern)',
};

const DIFFICULTY_ORDER: Difficulty[] = ['Easy', 'Medium', 'Hard'];

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
        <p class="text-[#9d9d9d] text-sm mb-4">Each session contains {{ challengeCount() }} random challenge{{ challengeCount() === 1 ? '' : 's' }}. Your code is scored by AI.</p>

        <div class="mb-5">
          <span class="text-white text-sm font-medium block mb-2">Challenges per session</span>
          <div class="flex gap-2">
            @for (n of [1, 3, 5]; track n) {
              <button (click)="challengeCount.set($any(n))"
                class="px-4 py-1.5 rounded text-sm font-medium border transition"
                [class]="challengeCount() === n
                  ? 'bg-[#007acc] border-[#007acc] text-white'
                  : 'bg-transparent border-[#3c3c3c] text-[#9d9d9d] hover:border-[#007acc] hover:text-white'">
                {{ n }}
              </button>
            }
          </div>
        </div>

        <label class="flex items-center gap-3 mb-6 cursor-pointer w-fit">
          <div class="relative">
            <input type="checkbox" class="sr-only" [checked]="timerEnabled()"
              (change)="timerEnabled.set($any($event.target).checked)">
            <div class="w-10 h-6 rounded-full transition-colors"
              [class]="timerEnabled() ? 'bg-[#007acc]' : 'bg-[#3c3c3c]'"></div>
            <div class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform"
              [class]="timerEnabled() ? 'translate-x-4' : 'translate-x-0'"></div>
          </div>
          <div>
            <span class="text-white text-sm font-medium">Enable timer</span>
            <span class="block text-[#9d9d9d] text-xs">Easy 15 min · Medium 20 min · Hard 30 min</span>
          </div>
        </label>

        @if (configsLoading()) {
          <div class="text-[#9d9d9d] text-sm">Loading sessions…</div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (cfg of configs(); track cfg.language + cfg.difficulty) {
              <button (click)="start(cfg)" [disabled]="loading()"
                class="flex flex-col items-start p-5 rounded-lg bg-[#252526] border border-[#3c3c3c] hover:border-[#007acc] text-left transition disabled:opacity-50">
                <span class="text-white font-medium">{{ cfg.label }}</span>
                <span class="mt-1 text-sm px-2 py-0.5 rounded" [class]="difficultyClass(cfg.difficulty)">
                  {{ cfg.difficulty }}
                </span>
              </button>
            }
          </div>
        }

        @if (error()) {
          <p class="mt-4 text-red-400 text-sm">{{ error() }}</p>
        }
      </section>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  configs = signal<SessionConfig[]>([]);
  configsLoading = signal(true);
  loading = signal(false);
  error = signal('');
  timerEnabled = signal(false);
  challengeCount = signal<1 | 3 | 5>(3);

  constructor(
    readonly auth: AuthService,
    private sessions: SessionService,
    private challenges: ChallengesService,
    private router: Router,
  ) {}

  async ngOnInit() {
    try {
      const languages = await this.challenges.getLanguages();
      const configs: SessionConfig[] = [];
      for (const info of languages) {
        const label = LANGUAGE_LABELS[info.language] ?? info.language;
        for (const diff of DIFFICULTY_ORDER) {
          if (info.difficulties.includes(diff)) {
            configs.push({ language: info.language, label, difficulty: diff });
          }
        }
      }
      this.configs.set(configs);
    } catch {
      this.error.set('Could not load available sessions.');
    } finally {
      this.configsLoading.set(false);
    }
  }

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
      const session = await this.sessions.startSession({ language: cfg.language, difficulty: cfg.difficulty, count: this.challengeCount() });
      await this.router.navigate(['/challenge', session._id], {
        state: { timerEnabled: this.timerEnabled() }
      });
    } catch {
      this.error.set('Could not start session. Make sure challenges exist in the database.');
    } finally {
      this.loading.set(false);
    }
  }
}
