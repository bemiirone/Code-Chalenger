import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';
import { ChallengesService } from './challenges.service';
import { ChallengeEntity } from '../database/schemas/challenge.schema';

const makeChallenge = (overrides = {}) => ({
  _id: 'c1', title: 'Test', language: 'angular-ts', difficulty: 'Easy',
  description: '', starter_code: '', solution_code: '', ai_scoring_prompt: '',
  version_constraints: [], tags: [], ...overrides,
});

describe('ChallengesService', () => {
  let service: ChallengesService;
  let challengeModel: {
    aggregate: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    challengeModel = {
      aggregate: vi.fn(),
      findById: vi.fn(),
      find: vi.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ChallengesService,
        { provide: getModelToken(ChallengeEntity.name), useValue: challengeModel },
      ],
    }).compile();

    service = module.get(ChallengesService);
  });

  describe('findRandom', () => {
    it('runs a $match + $sample aggregation', async () => {
      const challenges = [makeChallenge()];
      challengeModel.aggregate.mockReturnValue({ exec: vi.fn().mockResolvedValue(challenges) });

      const result = await service.findRandom('angular-ts', 'Easy', 3);

      expect(challengeModel.aggregate).toHaveBeenCalledWith([
        { $match: { language: 'angular-ts', difficulty: 'Easy' } },
        { $sample: { size: 3 } },
      ]);
      expect(result).toEqual(challenges);
    });

    it('defaults count to 5', async () => {
      challengeModel.aggregate.mockReturnValue({ exec: vi.fn().mockResolvedValue([]) });
      await service.findRandom('typescript', 'Medium');
      expect(challengeModel.aggregate).toHaveBeenCalledWith([
        { $match: { language: 'typescript', difficulty: 'Medium' } },
        { $sample: { size: 5 } },
      ]);
    });
  });

  describe('findById', () => {
    it('returns the challenge when found', async () => {
      const challenge = makeChallenge();
      challengeModel.findById.mockReturnValue({ exec: vi.fn().mockResolvedValue(challenge) });

      expect(await service.findById('c1')).toEqual(challenge);
    });

    it('throws NotFoundException when challenge does not exist', async () => {
      challengeModel.findById.mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });
      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('returns all challenges with no filters', async () => {
      const challenges = [makeChallenge(), makeChallenge({ _id: 'c2' })];
      challengeModel.find.mockReturnValue({ select: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(challenges) }) });

      const result = await service.findAll();

      expect(challengeModel.find).toHaveBeenCalledWith({});
      expect(result).toEqual(challenges);
    });

    it('filters by language when provided', async () => {
      challengeModel.find.mockReturnValue({ select: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue([]) }) });
      await service.findAll('typescript');
      expect(challengeModel.find).toHaveBeenCalledWith({ language: 'typescript' });
    });

    it('filters by both language and difficulty when provided', async () => {
      challengeModel.find.mockReturnValue({ select: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue([]) }) });
      await service.findAll('typescript', 'Hard');
      expect(challengeModel.find).toHaveBeenCalledWith({ language: 'typescript', difficulty: 'Hard' });
    });

    it('excludes solution_code from results', async () => {
      const selectMock = vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue([]) });
      challengeModel.find.mockReturnValue({ select: selectMock });
      await service.findAll();
      expect(selectMock).toHaveBeenCalledWith('-solution_code');
    });
  });

  describe('getLanguages', () => {
    it('returns language info from aggregation', async () => {
      const rows = [
        { _id: 'angular-ts', difficulties: ['Easy', 'Medium', 'Hard'] },
        { _id: 'typescript', difficulties: ['Easy'] },
      ];
      challengeModel.aggregate.mockReturnValue({ exec: vi.fn().mockResolvedValue(rows) });

      const result = await service.getLanguages();

      expect(result).toEqual([
        { language: 'angular-ts', difficulties: ['Easy', 'Medium', 'Hard'] },
        { language: 'typescript', difficulties: ['Easy'] },
      ]);
    });

    it('groups by language and sorts alphabetically', async () => {
      challengeModel.aggregate.mockReturnValue({ exec: vi.fn().mockResolvedValue([]) });
      await service.getLanguages();
      expect(challengeModel.aggregate).toHaveBeenCalledWith([
        { $group: { _id: '$language', difficulties: { $addToSet: '$difficulty' } } },
        { $sort: { _id: 1 } },
      ]);
    });
  });
});
