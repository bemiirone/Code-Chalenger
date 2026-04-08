import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScoringResult } from '@code-challenger/shared';
import { SCORING_QUEUE } from './scoring.module';

export interface ScoringJobData {
  submissionId: string;
  challengePrompt: string;
  starterCode: string;
  userCode: string;
  aiScoringPrompt: string;
  language: string;
  targetVersion: string;
}

@Injectable()
export class ScoringService {
  constructor(@InjectQueue(SCORING_QUEUE) private scoringQueue: Queue) {}

  async enqueueScoring(data: ScoringJobData): Promise<ScoringResult> {
    const job = await this.scoringQueue.add('score', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
    return {
      jobId: job.id ?? '',
      score: 0,
      feedback: 'Your code is being scored. Check back shortly.',
    };
  }
}
