import { Component, OnInit, OnDestroy, inject, signal, computed, effect, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  Chart,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  LineController,
  Tooltip,
  Filler,
} from 'chart.js';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { ChallengesService } from '../../core/services/challenges.service';
import { Difficulty, SessionSummary } from '@code-challenger/shared';

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, LineController, Tooltip, Filler);

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
  'nodejs': 'Node.js (Backend)',
  'nestjs': 'NestJS (Server)',
};

const DIFFICULTY_ORDER: Difficulty[] = ['Easy', 'Medium', 'Hard'];

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChild('scoreChart') chartCanvas!: ElementRef<HTMLCanvasElement>;

  configs = signal<SessionConfig[]>([]);
  configsLoading = signal(true);
  loading = signal(false);
  error = signal('');
  timerEnabled = signal(true);
  challengeCount = signal<1 | 3 | 5>(3);
  pastSessions = signal<SessionSummary[]>([]);

  // Last 10 completed sessions in chronological order for the chart
  last10Completed = computed(() =>
    this.pastSessions()
      .filter((s) => s.status === 'Completed')
      .slice(0, 10)
      .reverse(),
  );

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

  selectedLanguage = signal<string | null>(null);

  selectedGroupConfigs = computed<SessionConfig[]>(() => {
    const lang = this.selectedLanguage();
    if (!lang) return [];
    return this.groupedConfigs().find(g => g.language === lang)?.configs ?? [];
  });

  readonly auth = inject(AuthService);
  private readonly sessions = inject(SessionService);
  private readonly challenges = inject(ChallengesService);
  private readonly router = inject(Router);
  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      const completed = this.last10Completed();
      if (completed.length > 0) {
        setTimeout(() => this.renderChart(completed), 0);
      }
    });
  }

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
      this.selectedLanguage.set(null);
    } else {
      this.error.set('Could not load available sessions.');
    }

    if (sessions.status === 'fulfilled') {
      this.pastSessions.set(sessions.value);
    }

    this.configsLoading.set(false);
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }

  private renderChart(completed: SessionSummary[]) {
    if (!this.chartCanvas) return;
    this.chart?.destroy();

    const labels = completed.map((s) => this.formatDate(s.createdAt));
    const data = completed.map((s) => {
      const max = s.challenges.length * 100;
      return max > 0 ? Math.round((s.score / max) * 100) : 0;
    });

    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            data,
            borderColor: '#007acc',
            backgroundColor: 'rgba(0, 122, 204, 0.1)',
            pointBackgroundColor: '#007acc',
            pointRadius: 5,
            pointHoverRadius: 7,
            cubicInterpolationMode: 'monotone',
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => ` Score: ${ctx.parsed.y}%`,
            },
          },
          legend: { display: false },
        },
        scales: {
          x: {
            ticks: { color: '#9d9d9d', font: { size: 11 } },
            grid: { color: '#3c3c3c' },
          },
          y: {
            min: 0,
            max: 100,
            ticks: { color: '#9d9d9d', stepSize: 20, callback: (v) => `${v}%` },
            grid: { color: '#3c3c3c' },
          },
        },
      },
    });
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
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
