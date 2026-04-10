import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { MarkdownPipe } from '../../core/pipes/markdown.pipe';
import { Session } from '@code-challenger/shared';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, MarkdownPipe],
  template: `
    <div class="min-h-screen bg-[#1e1e1e] p-6">
      <header class="flex items-center justify-between mb-8">
        <h1 class="text-2xl font-bold text-white">Session Results</h1>
        <a routerLink="/dashboard"
          class="text-sm text-[#007acc] hover:underline">← Back to Dashboard</a>
      </header>

      @if (loading()) {
        <div class="text-[#9d9d9d]">Loading results…</div>
      } @else if (session()) {
        <!-- Score summary -->
        <div class="mb-8 p-6 rounded-lg bg-[#252526] border border-[#3c3c3c] flex items-center gap-6">
          <div class="text-center">
            <div class="text-5xl font-bold" [class]="scoreColor()">{{ session()!.score }}</div>
            <div class="text-[#9d9d9d] text-sm mt-1">Total Score</div>
          </div>
          <div class="text-[#9d9d9d] text-sm">
            <p>{{ passCount() }} / 5 challenges passed (score ≥ 70)</p>
            <p class="mt-1">Status: <span class="text-white">{{ session()!.status }}</span></p>
          </div>
        </div>

        <!-- Per-challenge breakdown -->
        <div class="space-y-4">
          @for (result of session()!.results; track result.challengeId; let i = $index) {
            <div class="rounded-lg bg-[#252526] border border-[#3c3c3c] overflow-hidden">
              <button (click)="toggle(i)"
                class="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#2d2d2d]">
                <div class="flex items-center gap-3">
                  <span class="text-white font-medium">Challenge {{ i + 1 }}</span>
                  <span class="text-xs px-2 py-0.5 rounded font-medium"
                    [class]="result.score >= 70 ? 'text-green-400 bg-green-900/30' : 'text-red-400 bg-red-900/30'">
                    {{ result.score >= 70 ? 'Passed' : 'Failed' }}
                  </span>
                </div>
                <span class="text-white font-semibold">{{ result.score }}/100</span>
              </button>

              @if (expanded().has(i)) {
                <div class="px-5 pb-4 border-t border-[#3c3c3c] pt-4 space-y-3">
                  <div>
                    <p class="text-[#9d9d9d] text-xs uppercase tracking-wide mb-1">AI Feedback</p>
                    <div class="markdown-body" [innerHTML]="result.feedback | markdown"></div>
                  </div>
                  <div>
                    <button (click)="toggleSolution(i)"
                      class="text-[#007acc] text-sm hover:underline">
                      {{ showSolution().has(i) ? 'Hide Solution' : 'Show Suggested Solution' }}
                    </button>
                    @if (showSolution().has(i)) {
                      <div class="markdown-body mt-2"
                        [innerHTML]="codeBlock(result.userCode) | markdown"></div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ResultsComponent implements OnInit {
  loading = signal(true);
  session = signal<Session | null>(null);
  expanded = signal(new Set<number>());
  showSolution = signal(new Set<number>());

  passCount = computed(() =>
    (this.session()?.results ?? []).filter((r) => r.score >= 70).length,
  );
  scoreColor = computed(() => {
    const s = this.session()?.score ?? 0;
    if (s >= 350) return 'text-green-400';
    if (s >= 200) return 'text-yellow-400';
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

  codeBlock(code: string): string {
    return '```typescript\n' + code + '\n```';
  }
}
