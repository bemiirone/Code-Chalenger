import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SessionService } from './session.service';

const mockSession = {
  _id: 'sess1',
  challenges: ['c1', 'c2', 'c3'],
  status: 'Active' as const,
  score: 0,
  results: [],
  user_id: 'u1',
  timestamp: new Date(),
};

describe('SessionService', () => {
  let service: SessionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SessionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('startSession', () => {
    it('POSTs to /api/sessions', async () => {
      const p = service.startSession({ language: 'angular-ts', difficulty: 'Easy', count: 3 });
      const req = http.expectOne('/api/sessions');
      expect(req.request.method).toBe('POST');
      req.flush(mockSession);
      await p;
    });

    it('sets activeSession signal', async () => {
      const p = service.startSession({ language: 'angular-ts', difficulty: 'Easy', count: 3 });
      http.expectOne('/api/sessions').flush(mockSession);
      await p;
      expect(service.activeSession()).toEqual(mockSession);
    });

    it('resets currentChallengeIndex to 0', async () => {
      service.advanceChallenge();
      service.advanceChallenge();
      const p = service.startSession({ language: 'angular-ts', difficulty: 'Easy', count: 3 });
      http.expectOne('/api/sessions').flush(mockSession);
      await p;
      expect(service.currentChallengeIndex()).toBe(0);
    });

    it('returns the session', async () => {
      const p = service.startSession({ language: 'angular-ts', difficulty: 'Easy', count: 3 });
      http.expectOne('/api/sessions').flush(mockSession);
      expect(await p).toEqual(mockSession);
    });
  });

  describe('loadSession', () => {
    it('GETs /api/sessions/:id', async () => {
      const p = service.loadSession('sess1');
      const req = http.expectOne('/api/sessions/sess1');
      expect(req.request.method).toBe('GET');
      req.flush(mockSession);
      await p;
    });

    it('sets activeSession signal', async () => {
      const p = service.loadSession('sess1');
      http.expectOne('/api/sessions/sess1').flush(mockSession);
      await p;
      expect(service.activeSession()).toEqual(mockSession);
    });
  });

  describe('submitAnswer', () => {
    it('POSTs to /api/sessions/submit', async () => {
      const dto = { sessionId: 'sess1', challengeId: 'c1', userCode: 'const x = 1;', elapsedSeconds: 60 };
      const result = { score: 85, feedback: 'Well done', jobId: 'j1' };
      const p = service.submitAnswer(dto);
      const req = http.expectOne('/api/sessions/submit');
      expect(req.request.method).toBe('POST');
      req.flush(result);
      expect(await p).toEqual(result);
    });
  });

  describe('listSessions', () => {
    it('GETs /api/sessions', async () => {
      const p = service.listSessions();
      const req = http.expectOne('/api/sessions');
      expect(req.request.method).toBe('GET');
      req.flush([mockSession]);
      expect(await p).toEqual([mockSession]);
    });
  });

  describe('advanceChallenge', () => {
    it('increments currentChallengeIndex', () => {
      expect(service.currentChallengeIndex()).toBe(0);
      service.advanceChallenge();
      expect(service.currentChallengeIndex()).toBe(1);
    });

    it('can be called multiple times', () => {
      service.advanceChallenge();
      service.advanceChallenge();
      service.advanceChallenge();
      expect(service.currentChallengeIndex()).toBe(3);
    });
  });
});
