import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Job } from 'bullmq';
import { SubmissionEntity, SubmissionDocument } from '../database/schemas/submission.schema';
import { SessionEntity, SessionDocument } from '../database/schemas/session.schema';
import { AiProviderFactory } from './providers/ai-provider.factory';
import { ScoringJobData } from './scoring.service';
import { SCORING_QUEUE } from './scoring.constants';

@Processor(SCORING_QUEUE)
export class ScoringProcessor extends WorkerHost {
  private readonly logger = new Logger(ScoringProcessor.name);

  constructor(
    @InjectModel(SubmissionEntity.name) private submissionModel: Model<SubmissionDocument>,
    @InjectModel(SessionEntity.name) private sessionModel: Model<SessionDocument>,
    private aiFactory: AiProviderFactory,
  ) {
    super();
  }

  async process(job: Job<ScoringJobData>): Promise<void> {
    const { submissionId, ...scoreRequest } = job.data;
    this.logger.log(`Scoring submission ${submissionId}`);

    try {
      const provider = this.aiFactory.getProvider();
      const result = await provider.score(scoreRequest);

      await this.submissionModel.findByIdAndUpdate(submissionId, {
        score: result.score,
        feedback: result.feedback,
        status: 'scored',
      });

      // Update the matching result in the parent session
      await this.sessionModel.updateOne(
        { 'results.challengeId': new Types.ObjectId(job.data.challengeId) },
        {
          $set: {
            'results.$.score': result.score,
            'results.$.feedback': result.feedback,
          },
        },
      );

      // Recalculate session total score
      const submission = await this.submissionModel.findById(submissionId);
      if (submission) {
        const sessionResults = await this.submissionModel
          .find({ session_id: submission.session_id, status: 'scored' })
          .exec();
        const total = sessionResults.reduce((acc, s) => acc + (s.score ?? 0), 0);
        await this.sessionModel.findByIdAndUpdate(submission.session_id, { score: total });
      }
    } catch (err) {
      this.logger.error(`Failed to score submission ${submissionId}`, err);
      await this.submissionModel.findByIdAndUpdate(submissionId, { status: 'failed' });
      throw err; // let BullMQ retry
    }
  }
}
