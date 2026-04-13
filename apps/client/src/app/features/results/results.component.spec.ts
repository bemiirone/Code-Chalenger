import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { ResultsComponent } from './results.component';
import { SessionService } from '../../core/services/session.service';

const mockChallenges = [
  { _id: 'c1', title: 'First Challenge', language: 'angular-ts', difficulty: 'Easy', version_constraints: [] },
  { _id: 'c2', title: 'Second Challenge', language: 'css3', difficulty: 'Medium', version_constraints: [] },
  { _id: 'c3', title: 'Third Challenge', language: 'javascript', difficulty: 'Hard', version_constraints: [] },
];

const mockSession = {
  _id: 'sess1', challenges: mockChallenges, status: 'Completed' as const, score: 220,
  results: [
    { challengeId: 'c1', score: 90, feedback: '**Great job**', userCode: 'const x = 1;', elapsedSeconds: 120 },
    { challengeId: 'c2', score: 40, feedback: 'Needs work',   userCode: '.btn {}',       elapsedSeconds: 300 },
    { challengeId: 'c3', score: 90, feedback: 'Excellent',    userCode: 'function f(){}', elapsedSeconds: 180 },
  ],
  user_id: 'u1', timestamp: new Date(),
};

describe('ResultsComponent', () => {
  let component: ResultsComponent;
  let sessionsMock: { loadSession: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    sessionsMock = { loadSession: vi.fn().mockResolvedValue(mockSession) };

    await TestBed.configureTestingModule({
      imports: [ResultsComponent],
      providers: [
        { provide: SessionService, useValue: sessionsMock },
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'sess1' }) } } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('creates and loads session by route id', () => {
    expect(component).toBeTruthy();
    expect(sessionsMock.loadSession).toHaveBeenCalledWith('sess1');
  });

  describe('passCount', () => {
    it('counts results with score >= 70', () => {
      expect(component.passCount()).toBe(2); // c1=90, c3=90 pass; c2=40 fails
    });
  });

  describe('totalElapsed', () => {
    it('sums elapsedSeconds across all results', () => {
      expect(component.totalElapsed()).toBe(600); // 120 + 300 + 180
    });
  });

  describe('scoreColor', () => {
    it('returns green when score >= count * 70', () => {
      // score=220, threshold=3*70=210 — above threshold
      expect(component.scoreColor()).toBe('text-green-400');
    });

    it('returns yellow when score is between count*40 and count*70', () => {
      component.session.set({ ...mockSession, score: 150 } as never);
      // 150 < 210, 150 >= 120
      expect(component.scoreColor()).toBe('text-yellow-400');
    });

    it('returns red when score < count * 40', () => {
      component.session.set({ ...mockSession, score: 50 } as never);
      expect(component.scoreColor()).toBe('text-red-400');
    });
  });

  describe('challengeTitle', () => {
    it('returns the challenge title by id', () => {
      expect(component.challengeTitle('c1', 0)).toBe('First Challenge');
      expect(component.challengeTitle('c2', 1)).toBe('Second Challenge');
    });

    it('falls back to "Challenge N" when id is not found', () => {
      expect(component.challengeTitle('unknown', 4)).toBe('Challenge 5');
    });
  });

  describe('codeBlock', () => {
    it('uses typescript fence for angular-ts', () => {
      expect(component.codeBlock('code', 'c1')).toContain('```typescript');
    });

    it('uses css fence for css3', () => {
      expect(component.codeBlock('code', 'c2')).toContain('```css');
    });

    it('uses javascript fence for javascript', () => {
      expect(component.codeBlock('code', 'c3')).toContain('```javascript');
    });

    it('wraps code between the fences', () => {
      expect(component.codeBlock('const x = 1;', 'c1')).toMatch(/^```typescript\nconst x = 1;\n```$/);
    });
  });

  describe('allowedTime', () => {
    it('returns 15m for Easy', () => { expect(component.allowedTime('c1')).toBe('15m'); });
    it('returns 20m for Medium', () => { expect(component.allowedTime('c2')).toBe('20m'); });
    it('returns 30m for Hard',   () => { expect(component.allowedTime('c3')).toBe('30m'); });

    it('returns em dash for unknown challenge id', () => {
      expect(component.allowedTime('unknown')).toBe('—');
    });
  });

  describe('toggle', () => {
    it('adds index to expanded set', () => {
      expect(component.expanded().has(0)).toBe(false);
      component.toggle(0);
      expect(component.expanded().has(0)).toBe(true);
    });

    it('removes index when toggled again', () => {
      component.toggle(0);
      component.toggle(0);
      expect(component.expanded().has(0)).toBe(false);
    });

    it('can expand multiple results independently', () => {
      component.toggle(0);
      component.toggle(2);
      expect(component.expanded().has(0)).toBe(true);
      expect(component.expanded().has(1)).toBe(false);
      expect(component.expanded().has(2)).toBe(true);
    });
  });

  describe('toggleSolution', () => {
    it('adds index to showSolution set', () => {
      component.toggleSolution(1);
      expect(component.showSolution().has(1)).toBe(true);
    });

    it('removes index when toggled again', () => {
      component.toggleSolution(1);
      component.toggleSolution(1);
      expect(component.showSolution().has(1)).toBe(false);
    });
  });

  describe('formatTime', () => {
    it('formats minutes and seconds', () => {
      expect(component.formatTime(90)).toBe('1m 30s');
      expect(component.formatTime(125)).toBe('2m 5s');
    });

    it('formats seconds only when under a minute', () => {
      expect(component.formatTime(45)).toBe('45s');
    });

    it('returns em dash for zero', () => {
      expect(component.formatTime(0)).toBe('—');
    });

    it('returns em dash for undefined', () => {
      expect(component.formatTime(undefined)).toBe('—');
    });
  });
});
