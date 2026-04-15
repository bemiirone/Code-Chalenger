import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScoringResult } from '@code-challenger/shared';
import { SCORING_QUEUE } from './scoring.constants';
import { AiProviderFactory } from './providers/ai-provider.factory';

export interface ScoringJobData {
  submissionId: string;
  challengeId: string;
  challengePrompt: string;
  starterCode: string;
  userCode: string;
  aiScoringPrompt: string;
  language: string;
  targetVersion: string;
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(
    @InjectQueue(SCORING_QUEUE) private scoringQueue: Queue,
    private aiFactory: AiProviderFactory,
  ) {}

  /** Score synchronously — awaits the AI response before returning.
   *  Falls back to the async queue on transient failures (timeouts, network errors). */
  async scoreNow(data: ScoringJobData): Promise<ScoringResult> {
    try {
      const provider = this.aiFactory.getProvider();
      const result = await provider.score({
        challengePrompt: data.challengePrompt,
        starterCode: data.starterCode,
        userCode: data.userCode,
        aiScoringPrompt: data.aiScoringPrompt,
        language: data.language,
        targetVersion: data.targetVersion,
      });
      return { score: result.score, feedback: result.feedback, jobId: '' };
    } catch (err) {
      this.logger.warn('Synchronous scoring failed, falling back to queue', err);
      return this.enqueueScoring(data);
    }
  }

  /** Enqueue for async processing (kept for future background use). */
  async enqueueScoring(data: ScoringJobData): Promise<ScoringResult> {
    const job = await this.scoringQueue.add('score', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
    return {
      jobId: job.id ?? '',
      score: 0,
      feedback: 'Your code is being scored. Check back shortly.',
      pending: true,
    };
  }
}
