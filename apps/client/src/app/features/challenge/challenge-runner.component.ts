import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { MonacoEditorComponent } from './monaco-editor.component';
import { MarkdownPipe } from '../../core/pipes/markdown.pipe';
import { Challenge, Session, ScoringResult } from '@code-challenger/shared';

@Component({
  standalone: true,
  imports: [CommonModule, MonacoEditorComponent, MarkdownPipe],
  template: `
    <div class="min-h-screen bg-[#1e1e1e] flex flex-col">
      <!-- Header -->
      <header class="flex items-center justify-between px-6 py-3 bg-[#252526] border-b border-[#3c3c3c]">
        <span class="text-white font-semibold">Code Challenger</span>
        <span class="text-[#9d9d9d] text-sm">
          Challenge {{ sessions.currentChallengeIndex() + 1 }} of 5
        </span>
        <div class="w-32 bg-[#3c3c3c] rounded-full h-1.5">
          <div class="bg-[#007acc] h-1.5 rounded-full transition-all"
            [style.width]="progress() + '%'"></div>
        </div>
      </header>

      @if (loading()) {
        <div class="flex-1 flex items-center justify-center">
          <div class="text-[#9d9d9d]">Loading session…</div>
        </div>
      } @else if (currentChallenge()) {
        <div class="flex-1 flex divide-x divide-[#3c3c3c] overflow-hidden">
          <!-- Left: Challenge description -->
          <aside class="w-2/5 p-6 overflow-y-auto">
            <h2 class="text-white text-xl font-semibold mb-3">{{ currentChallenge()!.title }}</h2>
            <div class="text-[#d4d4d4] text-sm whitespace-pre-wrap leading-relaxed">
              {{ currentChallenge()!.description }}
            </div>
          </aside>

          <!-- Right: Editor + submit -->
          <main class="flex-1 flex flex-col p-4 gap-4">
            <app-monaco-editor
              [(value)]="userCode"
              [language]="editorLanguage()"
              height="calc(100vh - 220px)"
            />

            <div class="flex items-center gap-4">
              <button (click)="submit()" [disabled]="submitting()"
                class="px-6 py-2 bg-[#007acc] hover:bg-[#1a8ad4] text-white rounded font-medium disabled:opacity-50">
                {{ submitting() ? 'Submitting…' : 'Submit Answer' }}
              </button>

              @if (result()) {
                <div class="flex-1 p-3 rounded bg-[#252526] border border-[#3c3c3c]">
                  <div class="flex items-center gap-3 mb-1">
                    <span class="text-white font-medium">Score: {{ result()!.score }}/100</span>
                    @if (result()!.score >= 80) { <span class="text-green-400 text-sm">Excellent!</span> }
                    @else if (result()!.score >= 50) { <span class="text-yellow-400 text-sm">Good effort</span> }
                    @else { <span class="text-red-400 text-sm">Needs improvement</span> }
                  </div>
                  <div class="markdown-body mt-1" [innerHTML]="result()!.feedback | markdown"></div>
                  <button (click)="next()" class="mt-2 text-[#007acc] text-sm hover:underline">
                    {{ isLast() ? 'View Results →' : 'Next Challenge →' }}
                  </button>
                </div>
              }
            </div>
          </main>
        </div>
      }
    </div>
  `,
})
export class ChallengeRunnerComponent implements OnInit {
  loading = signal(true);
  submitting = signal(false);
  result = signal<ScoringResult | null>(null);
  userCode = '';

  session = signal<Session | null>(null);

  currentChallenge = computed<Challenge | null>(() => {
    const s = this.session();
    const idx = this.sessions.currentChallengeIndex();
    if (!s || !s.challenges) return null;
    return (s.challenges[idx] as unknown as Challenge) ?? null;
  });

  editorLanguage = computed(() => {
    const lang = this.currentChallenge()?.language ?? 'typescript';
    return lang.startsWith('angular') ? 'typescript' : lang;
  });

  progress = computed(() => ((this.sessions.currentChallengeIndex()) / 5) * 100);
  isLast = computed(() => this.sessions.currentChallengeIndex() >= 4);

  constructor(
    readonly sessions: SessionService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    const s = await this.sessions.loadSession(id);
    this.session.set(s);
    this.userCode = this.currentChallenge()?.starter_code ?? '';
    this.loading.set(false);
  }

  async submit() {
    const challenge = this.currentChallenge();
    const s = this.session();
    if (!challenge || !s) return;

    this.submitting.set(true);
    try {
      const res = await this.sessions.submitAnswer({
        sessionId: s._id,
        challengeId: challenge._id,
        userCode: this.userCode,
      });
      this.result.set(res);
    } catch {
      this.result.set({ score: 0, feedback: 'Submission failed. Please try again.', jobId: '' });
    } finally {
      this.submitting.set(false);
    }
  }

  async next() {
    if (this.isLast()) {
      await this.router.navigate(['/results', this.session()?._id]);
    } else {
      this.sessions.advanceChallenge();
      this.result.set(null);
      this.userCode = this.currentChallenge()?.starter_code ?? '';
    }
  }
}
