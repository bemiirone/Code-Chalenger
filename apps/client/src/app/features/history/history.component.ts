import { Component, OnInit, OnDestroy, signal, computed, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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
import { SessionService } from '../../core/services/session.service';
import { SessionSummary } from '@code-challenger/shared';

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, LineController, Tooltip, Filler);

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './history.component.html',
})
export class HistoryComponent implements OnInit, OnDestroy {
  @ViewChild('scoreChart') chartCanvas!: ElementRef<HTMLCanvasElement>;

  loading = signal(true);
  error = signal('');
  sessions = signal<SessionSummary[]>([]);

  completedSessions = computed(() =>
    this.sessions()
      .filter((s) => s.status === 'Completed')
      .sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()),
  );
  totalCompleted = computed(() => this.completedSessions().length);
  averageScore = computed(() => {
    const c = this.completedSessions();
    if (c.length === 0) return 0;
    return Math.round(c.reduce((acc, s) => acc + s.score, 0) / c.length);
  });
  bestScore = computed(() => {
    const c = this.completedSessions();
    if (c.length === 0) return 0;
    return Math.max(...c.map((s) => s.score));
  });

  private chart: Chart | null = null;

  constructor(private sessionService: SessionService) {
    effect(() => {
      const completed = this.completedSessions();
      if (completed.length > 0) {
        setTimeout(() => this.renderChart(completed), 0);
      }
    });
  }

  async ngOnInit() {
    try {
      this.sessions.set(await this.sessionService.listSessions());
    } catch {
      this.error.set('Could not load session history.');
    } finally {
      this.loading.set(false);
    }
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
            label: 'Score',
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
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }

  primaryLanguage(s: SessionSummary): string {
    return s.challenges[0]?.language ?? '—';
  }

  primaryDifficulty(s: SessionSummary): string {
    return s.challenges[0]?.difficulty ?? '—';
  }

  difficultyClass(difficulty: string): string {
    const map: Record<string, string> = {
      Easy: 'text-green-400 bg-green-900/30',
      Medium: 'text-yellow-400 bg-yellow-900/30',
      Hard: 'text-red-400 bg-red-900/30',
    };
    return map[difficulty] ?? 'text-[#9d9d9d]';
  }
}
