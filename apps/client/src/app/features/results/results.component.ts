import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { MarkdownPipe } from '../../core/pipes/markdown.pipe';
import { Session, Challenge, TIMER_DURATIONS } from '@code-challenger/shared';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, MarkdownPipe],
  templateUrl: './results.component.html',
})
export class ResultsComponent implements OnInit {
  loading = signal(true);
  session = signal<Session | null>(null);
  expanded = signal(new Set<number>());
  showSolution = signal(new Set<number>());

  passCount = computed(() =>
    (this.session()?.results ?? []).filter((r) => r.score >= 70).length,
  );
  totalElapsed = computed(() =>
    (this.session()?.results ?? []).reduce((sum, r) => sum + (r.elapsedSeconds ?? 0), 0),
  );
  private challengeMap = computed(() => {
    const challenges = this.session()?.challenges as unknown as Challenge[];
    return new Map((challenges ?? []).map((c) => [c._id, c]));
  });

  scoreColor = computed(() => {
    const s = this.session()?.score ?? 0;
    const count = this.session()?.challenges?.length ?? 5;
    if (s >= count * 70) return 'text-green-400';
    if (s >= count * 40) return 'text-yellow-400';
    return 'text-red-400';
  });

  constructor(private route: ActivatedRoute, private sessions: SessionService) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.session.set(await this.sessions.loadSession(id));
    this.loading.set(false);
  }

  toggle(i: number) {
    this.expanded.update((set) => {
      const next = new Set(set);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  toggleSolution(i: number) {
    this.showSolution.update((set) => {
      const next = new Set(set);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  challengeTitle(challengeId: string, index: number): string {
    return this.challengeMap().get(challengeId)?.title ?? `Challenge ${index + 1}`;
  }

  codeBlock(code: string, challengeId: string): string {
    const lang = this.challengeMap().get(challengeId)?.language ?? 'typescript';
    const fenceLang = lang.startsWith('angular') ? 'typescript' : lang === 'css3' ? 'css' : lang;
    return '```' + fenceLang + '\n' + code + '\n```';
  }

  allowedTime(challengeId: string): string {
    const challenge = this.challengeMap().get(challengeId);
    const seconds = challenge?.difficulty ? TIMER_DURATIONS[challenge.difficulty] : null;
    if (!seconds) return '—';
    return `${seconds / 60}m`;
  }

  formatTime(seconds?: number): string {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }
}
