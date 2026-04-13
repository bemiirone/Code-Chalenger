import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { vi } from 'vitest';
import { SessionsService } from './sessions.service';
import { SessionEntity } from '../database/schemas/session.schema';
import { SubmissionEntity } from '../database/schemas/submission.schema';
import { ChallengesService } from '../challenges/challenges.service';
import { ScoringService } from '../scoring/scoring.service';

const userId = new Types.ObjectId().toString();
const challengeId = new Types.ObjectId().toString();
const sessionId = new Types.ObjectId().toString();

const mockChallenge = {
  _id: challengeId, title: 'Write a component', description: 'Create an Angular component',
  language: 'angular-ts', difficulty: 'Easy', starter_code: 'export class X {}',
  version_constraints: ['v19'], ai_scoring_prompt: 'Grade it',
};

const makeSession = (overrides = {}) => ({
  _id: sessionId,
  user_id: { toString: () => userId },
  challenges: [challengeId],
  status: 'Active',
  score: 0,
  results: [],
  save: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('SessionsService', () => {
  let service: SessionsService;
  let sessionModel: Record<string, ReturnType<typeof vi.fn>>;
  let submissionModel: Record<string, ReturnType<typeof vi.fn>>;
  let challengesService: { findRandom: ReturnType<typeof vi.fn>; findById: ReturnType<typeof vi.fn> };
  let scoringService: { scoreNow: ReturnType<typeof vi.fn> };
  let connectionMock: { startSession: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const mongoSessionMock = {
      withTransaction: vi.fn().mockImplementation(async (fn) => fn()),
      endSession: vi.fn().mockResolvedValue(undefined),
    };
    connectionMock = { startSession: vi.fn().mockResolvedValue(mongoSessionMock) };

    sessionModel = {
      create: vi.fn(),
      findById: vi.fn(),
      find: vi.fn(),
    };
    submissionModel = { create: vi.fn(), findByIdAndUpdate: vi.fn() };
    challengesService = { findRandom: vi.fn(), findById: vi.fn().mockResolvedValue(mockChallenge) };
    scoringService = { scoreNow: vi.fn().mockResolvedValue({ score: 80, feedback: 'Good', jobId: '' }) };

    const module = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: 'DatabaseConnection', useValue: connectionMock },
        { provide: getModelToken(SessionEntity.name), useValue: sessionModel },
        { provide: getModelToken(SubmissionEntity.name), useValue: submissionModel },
        { provide: ChallengesService, useValue: challengesService },
        { provide: ScoringService, useValue: scoringService },
      ],
    })
      .overrideProvider('DatabaseConnection')
      .useValue(connectionMock)
      .compile();

    service = module.get(SessionsService);
    // Inject connection directly since @InjectConnection uses a symbol token
    (service as never)['connection'] = connectionMock;
  });

  describe('startSession', () => {
    it('throws BadRequestException when not enough challenges exist', async () => {
      challengesService.findRandom.mockResolvedValue([]);
      await expect(service.startSession(userId, { language: 'angular-ts', difficulty: 'Easy', count: 3 }))
        .rejects.toThrow(BadRequestException);
    });

    it('creates a session with the challenge ids', async () => {
      const challenges = [mockChallenge, { ...mockChallenge, _id: 'c2' }, { ...mockChallenge, _id: 'c3' }];
      challengesService.findRandom.mockResolvedValue(challenges);
      sessionModel.create.mockResolvedValue({ _id: sessionId, challenges: challenges.map(c => c._id) });

      const session = await service.startSession(userId, { language: 'angular-ts', difficulty: 'Easy', count: 3 });

      expect(sessionModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Active' })
      );
      expect(session).toBeDefined();
    });
  });

  describe('getSession', () => {
    it('throws NotFoundException when session does not exist', async () => {
      sessionModel.findById.mockReturnValue({ populate: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(null) }) });
      await expect(service.getSession(sessionId, userId)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when session belongs to a different user', async () => {
      const otherUserId = new Types.ObjectId().toString();
      const session = makeSession({ user_id: { toString: () => otherUserId } });
      sessionModel.findById.mockReturnValue({ populate: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(session) }) });
      await expect(service.getSession(sessionId, userId)).rejects.toThrow(ForbiddenException);
    });

    it('returns the session when user matches', async () => {
      const session = makeSession();
      sessionModel.findById.mockReturnValue({ populate: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(session) }) });
      expect(await service.getSession(sessionId, userId)).toEqual(session);
    });
  });

  describe('submitAnswer', () => {
    const dto = { sessionId, challengeId, userCode: 'const x = 1;', elapsedSeconds: 60 };

    it('throws NotFoundException when session does not exist', async () => {
      sessionModel.findById.mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });
      await expect(service.submitAnswer(userId, dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when session belongs to a different user', async () => {
      const session = makeSession({ user_id: { toString: () => 'other-user' } });
      sessionModel.findById.mockReturnValue({ exec: vi.fn().mockResolvedValue(session) });
      await expect(service.submitAnswer(userId, dto)).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when session is already completed', async () => {
      const session = makeSession({ status: 'Completed' });
      sessionModel.findById.mockReturnValue({ exec: vi.fn().mockResolvedValue(session) });
      await expect(service.submitAnswer(userId, dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when challenge already submitted', async () => {
      const session = makeSession({
        results: [{ challengeId: { toString: () => challengeId }, score: 80, feedback: '', userCode: '' }],
      });
      sessionModel.findById.mockReturnValue({ exec: vi.fn().mockResolvedValue(session) });
      await expect(service.submitAnswer(userId, dto)).rejects.toThrow(BadRequestException);
    });

    it('calls scoreNow with challenge and user code', async () => {
      const session = makeSession();
      sessionModel.findById.mockReturnValue({ exec: vi.fn().mockResolvedValue(session) });
      submissionModel.create.mockResolvedValue({ _id: 'sub1' });
      submissionModel.findByIdAndUpdate.mockResolvedValue({});
      sessionModel.findById.mockReturnValue({ exec: vi.fn().mockResolvedValue(session) });
      // Also mock the second findById call from sessionModel used in the transaction
      sessionModel['findByIdAndUpdate'] = vi.fn().mockResolvedValue({});

      await service.submitAnswer(userId, dto);

      expect(scoringService.scoreNow).toHaveBeenCalledWith(
        expect.objectContaining({ userCode: 'const x = 1;', language: 'angular-ts' })
      );
    });

    it('returns the scoring result', async () => {
      const session = makeSession();
      sessionModel.findById.mockReturnValue({ exec: vi.fn().mockResolvedValue(session) });
      submissionModel.create.mockResolvedValue({ _id: 'sub1' });
      submissionModel.findByIdAndUpdate.mockResolvedValue({});
      sessionModel['findByIdAndUpdate'] = vi.fn().mockResolvedValue({});

      const result = await service.submitAnswer(userId, dto);

      expect(result.score).toBe(80);
      expect(result.feedback).toBe('Good');
    });
  });

  describe('getUserSessions', () => {
    it('returns sessions sorted by createdAt descending', async () => {
      const sessions = [makeSession(), makeSession()];
      sessionModel.find.mockReturnValue({
        select: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(sessions) }) }),
      });

      const result = await service.getUserSessions(userId);

      expect(sessionModel.find).toHaveBeenCalledWith({ user_id: userId });
      expect(result).toEqual(sessions);
    });

    it('excludes userCode from results', async () => {
      const selectMock = vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue([]) }) });
      sessionModel.find.mockReturnValue({ select: selectMock });

      await service.getUserSessions(userId);

      expect(selectMock).toHaveBeenCalledWith('-results.userCode');
    });
  });
});
