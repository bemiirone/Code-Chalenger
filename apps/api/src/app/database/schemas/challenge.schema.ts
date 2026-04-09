import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Difficulty } from '@code-challenger/shared';

export type ChallengeDocument = HydratedDocument<ChallengeEntity>;

@Schema({ collection: 'challenges' })
export class ChallengeEntity {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true, index: true })
  language!: string;

  @Prop({ type: [String], default: [] })
  version_constraints!: string[];

  @Prop({ required: true })
  starter_code!: string;

  @Prop({ required: true })
  solution_code!: string;

  @Prop({
    type: [{ input: String, expectedOutput: String }],
    default: [],
  })
  test_cases!: Array<{ input: string; expectedOutput: string }>;

  @Prop({ required: true })
  ai_scoring_prompt!: string;

  @Prop({ type: String, required: true, enum: ['Easy', 'Medium', 'Hard'], index: true })
  difficulty!: Difficulty;

  @Prop({ type: [String], default: [], index: true })
  tags!: string[];
}

export const ChallengeSchema = SchemaFactory.createForClass(ChallengeEntity);
