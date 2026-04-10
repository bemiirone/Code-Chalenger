import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SessionEntity, SessionDocument } from '../database/schemas/session.schema';
import { SubmissionEntity, SubmissionDocument } from '../database/schemas/submission.schema';
import { ChallengesService } from '../challenges/challenges.service';
import { ScoringService } from '../scoring/scoring.service';
import { StartSessionDto, SubmitAnswerDto, ScoringResult } from '@code-challenger/shared';

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(SessionEntity.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(SubmissionEntity.name) private submissionModel: Model<SubmissionDocument>,
    private challengesService: ChallengesService,
    private scoringService: ScoringService,
  ) {}

  async startSession(userId: string, dto: StartSessionDto): Promise<SessionDocument> {
    const challenges = await this.challengesService.findRandom(dto.language, dto.difficulty, 5);
    if (challenges.length < 5) {
      throw new BadRequestException(
        `Not enough challenges for ${dto.language}/${dto.difficulty}. Found ${challenges.length}, need 5.`,
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
    const session = await this.sessionModel
      .findById(dto.sessionId)
      .exec();
    if (!session) throw new NotFoundException('Session not found');
    if (session.user_id.toString() !== userId) throw new ForbiddenException();
    if (session.status !== 'Active') throw new BadRequestException('Session is already completed');

    const alreadyAnswered = session.results.some(
      (r) => r.challengeId.toString() === dto.challengeId,
    );
    if (alreadyAnswered) throw new BadRequestException('Challenge already submitted in this session');

    const challenge = await this.challengesService.findById(dto.challengeId);

    const submission = await this.submissionModel.create({
      user_id: new Types.ObjectId(userId),
      session_id: new Types.ObjectId(dto.sessionId),
      challenge_id: new Types.ObjectId(dto.challengeId),
      userCode: dto.userCode,
      status: 'pending',
    });

    const result = await this.scoringService.scoreNow({
      submissionId: submission._id.toString(),
      challengePrompt: challenge.description,
      starterCode: challenge.starter_code,
      userCode: dto.userCode,
      aiScoringPrompt: challenge.ai_scoring_prompt,
      language: challenge.language,
      targetVersion: challenge.version_constraints[0] ?? 'latest',
    });

    // Persist real score on submission
    await this.submissionModel.findByIdAndUpdate(submission._id, {
      score: result.score,
      feedback: result.feedback,
      status: 'scored',
    });

    // Update session results with real score
    session.results.push({
      challengeId: new Types.ObjectId(dto.challengeId),
      score: result.score,
      feedback: result.feedback,
      userCode: dto.userCode,
    });

    const answered = session.results.length;
    if (answered >= 5) {
      session.status = 'Completed';
    }

    // Recalculate total session score
    session.score = session.results.reduce((sum, r) => sum + r.score, 0);
    await session.save();

    return result;
  }

  async getUserSessions(userId: string): Promise<SessionDocument[]> {
    return this.sessionModel
      .find({ user_id: userId })
      .select('-results.userCode')
      .sort({ createdAt: -1 })
      .exec();
  }
}
