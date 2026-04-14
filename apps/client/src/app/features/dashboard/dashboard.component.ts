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
  templateUrl: './dashboard.component.html',
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
