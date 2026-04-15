import { TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { ChallengeRunnerComponent } from './challenge-runner.component';
import { MonacoEditorComponent } from './monaco-editor.component';
import { SessionService } from '../../core/services/session.service';

// Stub Monaco to avoid CDN loading in tests — must match the bound inputs/outputs
@Component({ selector: 'app-monaco-editor', standalone: true, template: '' })
class MonacoEditorStub {
  @Input() value = '';
  @Input() language = '';
  @Input() height = '';
  @Output() valueChange = new EventEmitter<string>();
}

const challenge1 = {
  _id: 'c1', title: 'Write a component', description: 'Create an Angular component',
  language: 'angular-ts', difficulty: 'Easy' as const, starter_code: 'export class X {}',
  version_constraints: ['v19'], ai_scoring_prompt: '', solution_code: '', test_cases: [], tags: [],
};
const challenge2 = { ...challenge1, _id: 'c2', title: 'Write a service', starter_code: 'export class S {}' };

const mockSession = {
  _id: 'sess1', challenges: [challenge1, challenge2],
  status: 'Active' as const, score: 0, results: [], user_id: 'u1', timestamp: new Date(),
};

describe('ChallengeRunnerComponent', () => {
  let component: ChallengeRunnerComponent;
  let router: Router;
  let currentChallengeIndex: ReturnType<typeof signal<number>>;
  let sessionsMock: {
    currentChallengeIndex: ReturnType<typeof signal<number>>;
    loadSession: ReturnType<typeof vi.fn>;
    submitAnswer: ReturnType<typeof vi.fn>;
    advanceChallenge: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    currentChallengeIndex = signal(0);
    sessionsMock = {
      currentChallengeIndex,
      loadSession: vi.fn().mockResolvedValue(mockSession),
      submitAnswer: vi.fn(),
      advanceChallenge: vi.fn().mockImplementation(() => currentChallengeIndex.update(i => i + 1)),
    };

    await TestBed.configureTestingModule({
      imports: [ChallengeRunnerComponent],
      providers: [
        { provide: SessionService, useValue: sessionsMock },
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'sess1' }) } } },
      ],
    })
      .overrideComponent(ChallengeRunnerComponent, {
        remove: { imports: [MonacoEditorComponent] },
        add: { imports: [MonacoEditorStub] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(ChallengeRunnerComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    await fixture.whenStable();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('loads the session by route id', () => {
      expect(sessionsMock.loadSession).toHaveBeenCalledWith('sess1');
    });

    it('sets userCode to the first challenge starter_code', () => {
      expect(component.userCode()).toBe('export class X {}');
    });

    it('sets loading to false after load', () => {
      expect(component.loading()).toBe(false);
    });
  });

  describe('currentChallenge', () => {
    it('returns the challenge at current index', () => {
      expect(component.currentChallenge()?._id).toBe('c1');
    });

    it('updates when index advances', () => {
      currentChallengeIndex.set(1);
      expect(component.currentChallenge()?._id).toBe('c2');
    });
  });

  describe('editorLanguage', () => {
    it('maps angular-ts to typescript', () => {
      expect(component.editorLanguage()).toBe('typescript');
    });

    it('maps css3 to css', () => {
      component.session.set({ ...mockSession, challenges: [{ ...challenge1, language: 'css3' }] } as never);
      expect(component.editorLanguage()).toBe('css');
    });

    it('maps nodejs to typescript', () => {
      component.session.set({ ...mockSession, challenges: [{ ...challenge1, language: 'nodejs' }] } as never);
      expect(component.editorLanguage()).toBe('typescript');
    });

    it('maps nestjs to typescript', () => {
      component.session.set({ ...mockSession, challenges: [{ ...challenge1, language: 'nestjs' }] } as never);
      expect(component.editorLanguage()).toBe('typescript');
    });

    it('passes other languages through unchanged', () => {
      component.session.set({ ...mockSession, challenges: [{ ...challenge1, language: 'javascript' }] } as never);
      expect(component.editorLanguage()).toBe('javascript');
    });
  });

  describe('progress', () => {
    it('is 50% on the first of two challenges', () => {
      expect(component.progress()).toBeCloseTo(50);
    });

    it('is 100% on the last challenge', () => {
      currentChallengeIndex.set(1);
      expect(component.progress()).toBeCloseTo(100);
    });
  });

  describe('isLast', () => {
    it('is false when not on the last challenge', () => {
      expect(component.isLast()).toBe(false);
    });

    it('is true on the last challenge', () => {
      currentChallengeIndex.set(1);
      expect(component.isLast()).toBe(true);
    });
  });

  describe('submit', () => {
    const scoringResult = { score: 85, feedback: 'Nice work', jobId: 'j1' };

    it('calls submitAnswer with session id, challenge id and user code', async () => {
      sessionsMock.submitAnswer.mockResolvedValue(scoringResult);
      component.userCode.set('const answer = 42;');
      await component.submit();
      expect(sessionsMock.submitAnswer).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 'sess1', challengeId: 'c1', userCode: 'const answer = 42;' })
      );
    });

    it('sets result on success and clears submitError', async () => {
      sessionsMock.submitAnswer.mockResolvedValue(scoringResult);
      await component.submit();
      expect(component.result()).toEqual(scoringResult);
      expect(component.submitError()).toBeNull();
    });

    it('sets submitError on failure and leaves result null', async () => {
      sessionsMock.submitAnswer.mockRejectedValue(new Error('network'));
      await component.submit();
      expect(component.result()).toBeNull();
      expect(component.submitError()).toContain('Submission failed');
    });

    it('clears submitError at the start of each attempt', async () => {
      sessionsMock.submitAnswer.mockRejectedValue(new Error('first'));
      await component.submit();
      expect(component.submitError()).toBeTruthy();

      sessionsMock.submitAnswer.mockResolvedValue(scoringResult);
      await component.submit();
      expect(component.submitError()).toBeNull();
    });

    it('resets submitting to false after success', async () => {
      sessionsMock.submitAnswer.mockResolvedValue(scoringResult);
      await component.submit();
      expect(component.submitting()).toBe(false);
    });

    it('resets submitting to false after failure', async () => {
      sessionsMock.submitAnswer.mockRejectedValue(new Error('fail'));
      await component.submit();
      expect(component.submitting()).toBe(false);
    });
  });

  describe('next', () => {
    it('advances challenge index and resets result', async () => {
      component.result.set({ score: 90, feedback: 'Done', jobId: '' });
      await component.next();
      expect(sessionsMock.advanceChallenge).toHaveBeenCalled();
      expect(component.result()).toBeNull();
    });

    it('resets submitError', async () => {
      component.submitError.set('previous error');
      await component.next();
      expect(component.submitError()).toBeNull();
    });

    it('sets userCode to the next challenge starter_code', async () => {
      await component.next();
      expect(component.userCode()).toBe('export class S {}');
    });

    it('navigates to /results/:id on the last challenge without advancing', async () => {
      currentChallengeIndex.set(1);
      const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      await component.next();
      expect(spy).toHaveBeenCalledWith(['/results', 'sess1']);
      expect(sessionsMock.advanceChallenge).not.toHaveBeenCalled();
    });
  });
});
