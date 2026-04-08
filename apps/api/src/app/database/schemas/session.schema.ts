import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SessionStatus } from '@code-challenger/shared';

export type SessionDocument = HydratedDocument<SessionEntity>;

@Schema({ timestamps: true })
export class SessionEntity {
  @Prop({ type: Types.ObjectId, ref: 'UserEntity', required: true, index: true })
  user_id!: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'ChallengeEntity' }] })
  challenges!: Types.ObjectId[];

  @Prop({ required: true, enum: ['Active', 'Completed'], default: 'Active' })
  status!: SessionStatus;

  @Prop({ default: 0 })
  score!: number;

  @Prop({
    type: [
      {
        challengeId: { type: Types.ObjectId, ref: 'ChallengeEntity' },
        score: Number,
        feedback: String,
        userCode: String,
      },
    ],
    default: [],
  })
  results!: Array<{
    challengeId: Types.ObjectId;
    score: number;
    feedback: string;
    userCode: string;
  }>;
}

export const SessionSchema = SchemaFactory.createForClass(SessionEntity);
