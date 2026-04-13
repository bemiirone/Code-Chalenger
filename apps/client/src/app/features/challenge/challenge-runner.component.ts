import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { MonacoEditorComponent } from './monaco-editor.component';
import { MarkdownPipe } from '../../core/pipes/markdown.pipe';
import { Challenge, Session, ScoringResult, TIMER_DURATIONS } from '@code-challenger/shared';

@Component({
  standalone: true,
  imports: [CommonModule, MonacoEditorComponent, MarkdownPipe],
  template: `
    <div class="min-h-screen bg-[#1e1e1e] flex flex-col">
      <!-- Header -->
      <header class="flex items-center justify-between px-6 py-3 bg-[#252526] border-b border-[#3c3c3c]">
        <span class="text-white font-semibold">Code Challenger</span>
        <span class="text-[#9d9d9d] text-sm">
          Challenge {{ sessions.currentChallengeIndex() + 1 }} of {{ session()?.challenges?.length ?? 5 }}
        </span>
        @if (timerEnabled) {
          <span class="font-mono text-sm px-3 py-1 rounded"
            [class]="timeRemaining() <= 60 ? 'text-red-400 bg-red-900/30' : 'text-[#9d9d9d]'">
            {{ timerDisplay() }}
          </span>
        }
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
              [value]="userCode()"
              (valueChange)="userCode.set($event)"
              [language]="editorLanguage()"
              height="calc(100vh - 220px)"
            />

            <div class="flex flex-col gap-4">
              @if (!result()) {
                <button (click)="submit()" [disabled]="submitting()"
                  class="self-start px-6 py-2 bg-[#007acc] hover:bg-[#1a8ad4] text-white rounded font-medium disabled:opacity-50">
                  {{ submitting() ? 'Submitting…' : 'Submit Answer' }}
                </button>
              }

              @if (result()) {
                <div class="p-4 rounded bg-[#252526] border border-[#3c3c3c]">
                  <div class="flex items-center gap-3 mb-3">
                    <span class="text-white font-semibold text-lg">{{ result()!.score }}/100</span>
                    @if (result()!.score >= 80) { <span class="text-green-400 text-sm font-medium">Excellent!</span> }
                    @else if (result()!.score >= 50) { <span class="text-yellow-400 text-sm font-medium">Good effort</span> }
                    @else { <span class="text-red-400 text-sm font-medium">Needs improvement</span> }
                  </div>
                  <div class="markdown-body" [innerHTML]="result()!.feedback | markdown"></div>
                  <button (click)="next()"
                    class="mt-4 px-4 py-2 bg-[#007acc] hover:bg-[#1a8ad4] text-white text-sm rounded font-medium">
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
export class ChallengeRunnerComponent implements OnInit, OnDestroy {
  loading = signal(true);
  submitting = signal(false);
  result = signal<ScoringResult | null>(null);
  userCode = signal('');

  session = signal<Session | null>(null);

  timerEnabled = false;
  timeRemaining = signal(0);
  timerDisplay = computed(() => {
    const s = this.timeRemaining();
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  });
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private challengeStartTime = 0;

  currentChallenge = computed<Challenge | null>(() => {
    const s = this.session();
    const idx = this.sessions.currentChallengeIndex();
    if (!s || !s.challenges) return null;
    return (s.challenges[idx] as unknown as Challenge) ?? null;
  });

  editorLanguage = computed(() => {
    const lang = this.currentChallenge()?.language ?? 'typescript';
    if (lang.startsWith('angular')) return 'typescript';
    if (lang === 'css3') return 'css';
    return lang;
  });

  progress = computed(() => ((this.sessions.currentChallengeIndex() + 1) / (this.session()?.challenges?.length ?? 5)) * 100);
  isLast = computed(() => this.sessions.currentChallengeIndex() >= (this.session()?.challenges?.length ?? 5) - 1);

  constructor(
    readonly sessions: SessionService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    const s = await this.sessions.loadSession(id);
    this.session.set(s);
    this.userCode.set(this.currentChallenge()?.starter_code ?? '');
    this.loading.set(false);

    this.timerEnabled = history.state?.timerEnabled === true;
    this.challengeStartTime = Date.now();
    if (this.timerEnabled) this.startTimer();
  }

  ngOnDestroy() {
    this.clearTimer();
  }

  private startTimer() {
    this.clearTimer();
    this.challengeStartTime = Date.now();
    const difficulty = this.currentChallenge()?.difficulty ?? 'Easy';
    this.timeRemaining.set(TIMER_DURATIONS[difficulty]);
    this.timerInterval = setInterval(() => {
      const remaining = this.timeRemaining() - 1;
      if (remaining <= 0) {
        this.timeRemaining.set(0);
        this.clearTimer();
        this.submit();
      } else {
        this.timeRemaining.set(remaining);
      }
    }, 1000);
  }

  private clearTimer() {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  async submit() {
    const challenge = this.currentChallenge();
    const s = this.session();
    if (!challenge || !s) return;

    this.submitting.set(true);
    this.clearTimer();
    try {
      const elapsedSeconds = Math.round((Date.now() - this.challengeStartTime) / 1000);
      const res = await this.sessions.submitAnswer({
        sessionId: s._id,
        challengeId: challenge._id,
        userCode: this.userCode(),
        elapsedSeconds,
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
      this.userCode.set(this.currentChallenge()?.starter_code ?? '');
      this.challengeStartTime = Date.now();
      if (this.timerEnabled) this.startTimer();
    }
  }
}
