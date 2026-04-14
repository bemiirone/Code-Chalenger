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
  templateUrl: './challenge-runner.component.html',
})
export class ChallengeRunnerComponent implements OnInit, OnDestroy {
  loading = signal(true);
  submitting = signal(false);
  result = signal<ScoringResult | null>(null);
  submitError = signal<string | null>(null);
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
    this.submitError.set(null);
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
      this.submitError.set('Submission failed — please try again.');
      if (this.timerEnabled) this.startTimer();
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
      this.submitError.set(null);
      this.userCode.set(this.currentChallenge()?.starter_code ?? '');
      this.challengeStartTime = Date.now();
      if (this.timerEnabled) this.startTimer();
    }
  }
}
