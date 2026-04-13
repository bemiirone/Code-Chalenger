import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { ChallengesService } from '../../core/services/challenges.service';
import { Session } from '@code-challenger/shared';

const mockLanguages = [
  { language: 'angular-ts', difficulties: ['Easy', 'Medium', 'Hard'] },
  { language: 'typescript', difficulties: ['Easy', 'Hard'] },
];

const mockSession: Partial<Session> = {
  _id: 'sess1', score: 250, status: 'Completed',
  challenges: ['c1', 'c2', 'c3'], results: [], createdAt: '2024-03-15T10:00:00Z',
};

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let sessionsMock: { startSession: ReturnType<typeof vi.fn>; listSessions: ReturnType<typeof vi.fn> };
  let challengesMock: { getLanguages: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    sessionsMock = { startSession: vi.fn(), listSessions: vi.fn().mockResolvedValue([]) };
    challengesMock = { getLanguages: vi.fn().mockResolvedValue(mockLanguages) };

    const authMock = { currentUser: signal(null), logout: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: SessionService, useValue: sessionsMock },
        { provide: ChallengesService, useValue: challengesMock },
        provideRouter([]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    await fixture.whenStable();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('loads language configs', () => {
      expect(challengesMock.getLanguages).toHaveBeenCalled();
      expect(component.configs().length).toBeGreaterThan(0);
    });

    it('sets configsLoading to false after loading', () => {
      expect(component.configsLoading()).toBe(false);
    });

    it('sets error when getLanguages fails', async () => {
      challengesMock.getLanguages.mockRejectedValue(new Error('fail'));
      await component.ngOnInit();
      expect(component.error()).toContain('Could not load');
    });

    it('still loads configs even if listSessions fails', async () => {
      sessionsMock.listSessions.mockRejectedValue(new Error('fail'));
      challengesMock.getLanguages.mockResolvedValue(mockLanguages);
      await component.ngOnInit();
      expect(component.configs().length).toBeGreaterThan(0);
      expect(component.pastSessions()).toEqual([]);
    });
  });

  describe('groupedConfigs', () => {
    it('groups configs by language', () => {
      expect(component.groupedConfigs().length).toBe(2);
    });

    it('assigns the correct number of difficulties per group', () => {
      const angularGroup = component.groupedConfigs().find(g => g.language === 'angular-ts');
      expect(angularGroup!.configs.length).toBe(3);
      const tsGroup = component.groupedConfigs().find(g => g.language === 'typescript');
      expect(tsGroup!.configs.length).toBe(2);
    });

    it('preserves Easy → Medium → Hard order within a group', () => {
      const angularGroup = component.groupedConfigs().find(g => g.language === 'angular-ts')!;
      expect(angularGroup.configs.map(c => c.difficulty)).toEqual(['Easy', 'Medium', 'Hard']);
    });

    it('resolves language labels from LANGUAGE_LABELS', () => {
      const angularGroup = component.groupedConfigs().find(g => g.language === 'angular-ts')!;
      expect(angularGroup.label).toBe('Angular (v19)');
    });
  });

  describe('difficultyClass', () => {
    it('returns green class for Easy', () => {
      expect(component.difficultyClass('Easy')).toContain('green');
    });

    it('returns yellow class for Medium', () => {
      expect(component.difficultyClass('Medium')).toContain('yellow');
    });

    it('returns red class for Hard', () => {
      expect(component.difficultyClass('Hard')).toContain('red');
    });
  });

  describe('formatDate', () => {
    it('formats a valid ISO date string', () => {
      const result = component.formatDate('2024-03-15T10:00:00Z');
      expect(result).toContain('2024');
      expect(result).toContain('15');
    });

    it('returns empty string for undefined', () => {
      expect(component.formatDate(undefined)).toBe('');
    });
  });

  describe('start', () => {
    const fakeSession = { _id: 'sess42', challenges: [], status: 'Active', score: 0, results: [], user_id: 'u1', timestamp: new Date() };

    it('calls startSession with language, difficulty, and count', async () => {
      sessionsMock.startSession.mockResolvedValue(fakeSession);
      vi.spyOn(router, 'navigate').mockResolvedValue(true);
      await component.start({ language: 'angular-ts', label: 'Angular', difficulty: 'Easy' });
      expect(sessionsMock.startSession).toHaveBeenCalledWith(
        expect.objectContaining({ language: 'angular-ts', difficulty: 'Easy' })
      );
    });

    it('navigates to /challenge/:id', async () => {
      sessionsMock.startSession.mockResolvedValue(fakeSession);
      const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      await component.start({ language: 'angular-ts', label: 'Angular', difficulty: 'Easy' });
      expect(spy).toHaveBeenCalledWith(['/challenge', 'sess42'], expect.anything());
    });

    it('passes timerEnabled state to route navigation', async () => {
      sessionsMock.startSession.mockResolvedValue(fakeSession);
      const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      component.timerEnabled.set(true);
      await component.start({ language: 'angular-ts', label: 'Angular', difficulty: 'Easy' });
      expect(spy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ state: { timerEnabled: true } })
      );
    });

    it('sets error on failure', async () => {
      sessionsMock.startSession.mockRejectedValue(new Error('fail'));
      await component.start({ language: 'angular-ts', label: 'Angular', difficulty: 'Easy' });
      expect(component.error()).toContain('Could not start session');
    });

    it('resets loading to false after failure', async () => {
      sessionsMock.startSession.mockRejectedValue(new Error('fail'));
      await component.start({ language: 'angular-ts', label: 'Angular', difficulty: 'Easy' });
      expect(component.loading()).toBe(false);
    });
  });

  describe('pastSessions', () => {
    it('sets pastSessions from listSessions response', async () => {
      sessionsMock.listSessions.mockResolvedValue([mockSession]);
      await component.ngOnInit();
      expect(component.pastSessions().length).toBe(1);
      expect(component.pastSessions()[0]._id).toBe('sess1');
    });
  });
});
