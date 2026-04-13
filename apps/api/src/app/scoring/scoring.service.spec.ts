import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { vi } from 'vitest';
import { ScoringService, ScoringJobData } from './scoring.service';
import { AiProviderFactory } from './providers/ai-provider.factory';
import { SCORING_QUEUE } from './scoring.constants';

const jobData: ScoringJobData = {
  submissionId: 'sub1',
  challengePrompt: 'Write a component',
  starterCode: 'export class X {}',
  userCode: 'export class X { title = "hello"; }',
  aiScoringPrompt: 'Grade this Angular component',
  language: 'angular-ts',
  targetVersion: 'v19',
};

describe('ScoringService', () => {
  let service: ScoringService;
  let providerMock: { score: ReturnType<typeof vi.fn> };
  let factoryMock: { getProvider: ReturnType<typeof vi.fn> };
  let queueMock: { add: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    providerMock = { score: vi.fn() };
    factoryMock = { getProvider: vi.fn().mockReturnValue(providerMock) };
    queueMock = { add: vi.fn() };

    const module = await Test.createTestingModule({
      providers: [
        ScoringService,
        { provide: AiProviderFactory, useValue: factoryMock },
        { provide: getQueueToken(SCORING_QUEUE), useValue: queueMock },
      ],
    }).compile();

    service = module.get(ScoringService);
  });

  describe('scoreNow', () => {
    it('calls the AI provider with the correct scoring input', async () => {
      providerMock.score.mockResolvedValue({ score: 85, feedback: 'Well done' });

      await service.scoreNow(jobData);

      expect(providerMock.score).toHaveBeenCalledWith({
        challengePrompt: jobData.challengePrompt,
        starterCode: jobData.starterCode,
        userCode: jobData.userCode,
        aiScoringPrompt: jobData.aiScoringPrompt,
        language: jobData.language,
        targetVersion: jobData.targetVersion,
      });
    });

    it('returns score and feedback from the provider', async () => {
      providerMock.score.mockResolvedValue({ score: 75, feedback: '**Good effort**' });

      const result = await service.scoreNow(jobData);

      expect(result.score).toBe(75);
      expect(result.feedback).toBe('**Good effort**');
    });

    it('returns score 0 and error feedback when the provider throws', async () => {
      providerMock.score.mockRejectedValue(new Error('API timeout'));

      const result = await service.scoreNow(jobData);

      expect(result.score).toBe(0);
      expect(result.feedback).toContain('Scoring failed');
    });

    it('selects the provider via AiProviderFactory', async () => {
      providerMock.score.mockResolvedValue({ score: 90, feedback: 'Excellent' });

      await service.scoreNow(jobData);

      expect(factoryMock.getProvider).toHaveBeenCalled();
    });
  });

  describe('enqueueScoring', () => {
    it('adds a job to the scoring queue', async () => {
      queueMock.add.mockResolvedValue({ id: 'job-42' });

      await service.enqueueScoring(jobData);

      expect(queueMock.add).toHaveBeenCalledWith('score', jobData, expect.objectContaining({ attempts: 3 }));
    });

    it('returns a pending result with the job id', async () => {
      queueMock.add.mockResolvedValue({ id: 'job-42' });

      const result = await service.enqueueScoring(jobData);

      expect(result.jobId).toBe('job-42');
      expect(result.score).toBe(0);
    });
  });
});
