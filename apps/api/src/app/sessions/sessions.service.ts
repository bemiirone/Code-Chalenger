import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { SessionEntity, SessionDocument } from '../database/schemas/session.schema';
import { SubmissionEntity, SubmissionDocument } from '../database/schemas/submission.schema';
import { ChallengesService } from '../challenges/challenges.service';
import { ScoringService } from '../scoring/scoring.service';
import { StartSessionDto, SubmitAnswerDto, ScoringResult } from '@code-challenger/shared';

@Injectable()
export class SessionsService {
  constructor(
    @InjectConnection() private connection: Connection,
    @InjectModel(SessionEntity.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(SubmissionEntity.name) private submissionModel: Model<SubmissionDocument>,
    private challengesService: ChallengesService,
    private scoringService: ScoringService,
  ) {}

  async startSession(userId: string, dto: StartSessionDto): Promise<SessionDocument> {
    const count = dto.count ?? 5;
    const challenges = await this.challengesService.findRandom(dto.language, dto.difficulty, count);
    if (challenges.length < count) {
      throw new BadRequestException(
        `Not enough challenges for ${dto.language}/${dto.difficulty}. Found ${challenges.length}, need ${count}.`,
      );
    }
    return this.sessionModel.create({
      user_id: new Types.ObjectId(userId),
      challenges: challenges.map((c) => c._id),
      status: 'Active',
    });
  }

  async getSession(sessionId: string, userId: string): Promise<SessionDocument> {
    const session = await this.sessionModel
      .findById(sessionId)
      .populate('challenges')
      .exec();
    if (!session) throw new NotFoundException('Session not found');
    if (session.user_id.toString() !== userId) throw new ForbiddenException();
    return session;
  }

  async submitAnswer(userId: string, dto: SubmitAnswerDto): Promise<ScoringResult> {
    // --- Validate (no transaction needed) ---
    const session = await this.sessionModel.findById(dto.sessionId).exec();
    if (!session) throw new NotFoundException('Session not found');
    if (session.user_id.toString() !== userId) throw new ForbiddenException();
    if (session.status !== 'Active') throw new BadRequestException('Session is already completed');

    const alreadyAnswered = session.results.some(
      (r) => r.challengeId.toString() === dto.challengeId,
    );
    if (alreadyAnswered) throw new BadRequestException('Challenge already submitted in this session');

    const challenge = await this.challengesService.findById(dto.challengeId);

    // --- Create submission record outside transaction (records the attempt) ---
    const submission = await this.submissionModel.create({
      user_id: new Types.ObjectId(userId),
      session_id: new Types.ObjectId(dto.sessionId),
      challenge_id: new Types.ObjectId(dto.challengeId),
      userCode: dto.userCode,
      status: 'pending',
    });

    // --- Score outside transaction (remote call; cannot participate in a DB transaction) ---
    const result = await this.scoringService.scoreNow({
      submissionId: submission._id.toString(),
      challengePrompt: challenge.description,
      starterCode: challenge.starter_code,
      userCode: dto.userCode,
      aiScoringPrompt: challenge.ai_scoring_prompt,
      language: challenge.language,
      targetVersion: challenge.version_constraints[0] ?? 'latest',
    });

    // --- Persist atomically: submission update + session update must both succeed ---
    // Uses findByIdAndUpdate (not mutate-and-save) so the callback is safe to retry
    // on transient write conflicts. Requires MongoDB replica set or Atlas.
    const resultEntry = {
      challengeId: new Types.ObjectId(dto.challengeId),
      score: result.score,
      feedback: result.feedback,
      userCode: dto.userCode,
      elapsedSeconds: dto.elapsedSeconds ?? 0,
    };
    const answeredCount = session.results.length + 1;
    const newStatus = answeredCount >= session.challenges.length ? 'Completed' : 'Active';
    const newScore = session.results.reduce((sum, r) => sum + r.score, 0) + result.score;

    const mongoSession = await this.connection.startSession();
    try {
      await mongoSession.withTransaction(async () => {
        await this.submissionModel.findByIdAndUpdate(
          submission._id,
          { score: result.score, feedback: result.feedback, status: 'scored' },
          { session: mongoSession },
        );
        await this.sessionModel.findByIdAndUpdate(
          session._id,
          { $push: { results: resultEntry }, $set: { status: newStatus, score: newScore } },
          { session: mongoSession },
        );
      });
    } catch (err: unknown) {
      // Standalone MongoDB does not support transactions — fall back to sequential writes.
      // On a replica set or Atlas, the transaction above is used for full atomicity.
      const isStandalone =
        err instanceof Error &&
        (err.message.includes('replica set') || (err as { codeName?: string }).codeName === 'IllegalOperation');
      if (!isStandalone) throw err;

      await this.submissionModel.findByIdAndUpdate(submission._id, {
        score: result.score, feedback: result.feedback, status: 'scored',
      });
      await this.sessionModel.findByIdAndUpdate(session._id, {
        $push: { results: resultEntry },
        $set: { status: newStatus, score: newScore },
      });
    } finally {
      await mongoSession.endSession();
    }

    return result;
  }

  async getUserSessions(userId: string): Promise<SessionDocument[]> {
    return this.sessionModel
      .find({ user_id: new Types.ObjectId(userId) })
      .select('-results.userCode')
      .populate('challenges', 'title language difficulty')
      .sort({ createdAt: -1 })
      .exec();
  }
}
