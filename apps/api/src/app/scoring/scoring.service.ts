import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScoringResult } from '@code-challenger/shared';
import { SCORING_QUEUE } from './scoring.constants';
import { AiProviderFactory } from './providers/ai-provider.factory';
import { ProviderResourceExhaustedError } from './providers/provider-errors';

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
   *  On resource exhaustion (quota/rate limit), tries the fallback provider before queuing. */
  async scoreNow(data: ScoringJobData): Promise<ScoringResult> {
    const scoreRequest = {
      challengePrompt: data.challengePrompt,
      starterCode: data.starterCode,
      userCode: data.userCode,
      aiScoringPrompt: data.aiScoringPrompt,
      language: data.language,
      targetVersion: data.targetVersion,
    };

    try {
      const provider = this.aiFactory.getProvider();
      const result = await provider.score(scoreRequest);
      return { score: result.score, feedback: result.feedback, jobId: '' };
    } catch (err) {
      if (err instanceof ProviderResourceExhaustedError) {
        this.logger.warn(`${err.providerName} resource exhausted (HTTP ${err.status}), trying fallback provider`);
        const fallback = this.aiFactory.getFallbackProvider();
        if (fallback) {
          try {
            const result = await fallback.score(scoreRequest);
            const note = `> **Note:** ${err.providerName} was temporarily unavailable (quota/resource limit). This submission was scored by the fallback provider.\n\n`;
            return { score: result.score, feedback: note + result.feedback, jobId: '' };
          } catch (fallbackErr) {
            this.logger.warn('Fallback provider also failed, falling back to queue', fallbackErr);
          }
        }
      } else {
        this.logger.warn('Synchronous scoring failed', err);
        return { score: 0, feedback: 'Scoring failed. Please try again.', jobId: '' };
      }
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
