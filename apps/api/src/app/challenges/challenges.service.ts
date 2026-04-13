import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChallengeEntity, ChallengeDocument } from '../database/schemas/challenge.schema';
import { Difficulty, LanguageInfo } from '@code-challenger/shared';

@Injectable()
export class ChallengesService {
  constructor(
    @InjectModel(ChallengeEntity.name)
    private challengeModel: Model<ChallengeDocument>,
  ) {}

  async findRandom(language: string, difficulty: Difficulty, count = 5): Promise<ChallengeDocument[]> {
    return this.challengeModel
      .aggregate([
        { $match: { language, difficulty } },
        { $sample: { size: count } },
      ])
      .exec();
  }

  async findById(id: string): Promise<ChallengeDocument> {
    const challenge = await this.challengeModel.findById(id).exec();
    if (!challenge) throw new NotFoundException(`Challenge ${id} not found`);
    return challenge;
  }

  async findAll(language?: string, difficulty?: Difficulty): Promise<ChallengeDocument[]> {
    const filter: Record<string, string> = {};
    if (language) filter['language'] = language;
    if (difficulty) filter['difficulty'] = difficulty;
    return this.challengeModel.find(filter).select('-solution_code').exec();
  }

  async getLanguages(): Promise<LanguageInfo[]> {
    const rows = await this.challengeModel
      .aggregate<{ _id: string; difficulties: string[] }>([
        { $group: { _id: '$language', difficulties: { $addToSet: '$difficulty' } } },
        { $sort: { _id: 1 } },
      ])
      .exec();
    return rows.map((r) => ({ language: r._id, difficulties: r.difficulties }));
  }
}
