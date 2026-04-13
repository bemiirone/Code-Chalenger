import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { ChallengesService } from '../../core/services/challenges.service';
import { Difficulty, Session } from '@code-challenger/shared';

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
  imports: [CommonModule, RouterLink],
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
          <div class="space-y-6">
            @for (group of groupedConfigs(); track group.language) {
              <div>
                <h3 class="text-[#e4d7d7] text-xs font-semibold uppercase tracking-widest mb-3">{{ group.label }}</h3>
                <div class="flex gap-3 flex-wrap">
                  @for (cfg of group.configs; track cfg.difficulty) {
                    <button (click)="start(cfg)" [disabled]="loading()"
                      class="flex flex-col items-start p-5 rounded-lg bg-[#252526] border border-[#3c3c3c] hover:border-[#007acc] text-left transition disabled:opacity-50 min-w-35">
                      <span class="text-white font-medium text-sm">{{ cfg.difficulty }}</span>
                      <span class="mt-1 text-xs px-2 py-0.5 rounded" [class]="difficultyClass(cfg.difficulty)">
                        {{ cfg.difficulty === 'Easy' ? '15 min' : cfg.difficulty === 'Medium' ? '20 min' : '30 min' }}
                      </span>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }

        @if (error()) {
          <p class="mt-4 text-red-400 text-sm">{{ error() }}</p>
        }
      </section>

      @if (pastSessions().length > 0) {
        <section class="mt-10">
          <h2 class="text-lg font-semibold text-white mb-4">Past Sessions</h2>
          <div class="space-y-2">
            @for (s of pastSessions(); track s._id) {
              <a [routerLink]="['/results', s._id]"
                class="flex items-center justify-between px-5 py-3 rounded-lg bg-[#252526] border border-[#3c3c3c] hover:border-[#007acc] transition">
                <div class="flex items-center gap-3">
                  <span class="text-[#9d9d9d] text-sm">{{ formatDate(s.createdAt) }}</span>
                  <span class="text-xs px-2 py-0.5 rounded font-medium"
                    [class]="s.status === 'Completed' ? 'text-green-400 bg-green-900/30' : 'text-yellow-400 bg-yellow-900/30'">
                    {{ s.status }}
                  </span>
                </div>
                <div class="flex items-center gap-4">
                  <span class="text-[#9d9d9d] text-sm">{{ s.results.length }}/{{ s.challenges.length }} answered</span>
                  <span class="text-white font-semibold text-sm">{{ s.score }} pts</span>
                </div>
              </a>
            }
          </div>
        </section>
      }
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
  pastSessions = signal<Session[]>([]);

  groupedConfigs = computed(() => {
    const map = new Map<string, { language: string; label: string; configs: SessionConfig[] }>();
    for (const cfg of this.configs()) {
      if (!map.has(cfg.language)) {
        map.set(cfg.language, { language: cfg.language, label: cfg.label, configs: [] });
      }
      map.get(cfg.language)?.configs.push(cfg);
    }
    return [...map.values()];
  });

  readonly auth = inject(AuthService);
  private readonly sessions = inject(SessionService);
  private readonly challenges = inject(ChallengesService);
  private readonly router = inject(Router);

  async ngOnInit() {
    const [languages, sessions] = await Promise.allSettled([
      this.challenges.getLanguages(),
      this.sessions.listSessions(),
    ]);

    if (languages.status === 'fulfilled') {
      const configs: SessionConfig[] = [];
      for (const info of languages.value) {
        const label = LANGUAGE_LABELS[info.language] ?? info.language;
        for (const diff of DIFFICULTY_ORDER) {
          if (info.difficulties.includes(diff)) {
            configs.push({ language: info.language, label, difficulty: diff });
          }
        }
      }
      this.configs.set(configs);
    } else {
      this.error.set('Could not load available sessions.');
    }

    if (sessions.status === 'fulfilled') {
      this.pastSessions.set(sessions.value);
    }

    this.configsLoading.set(false);
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
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
