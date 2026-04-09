import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SubmissionDocument = HydratedDocument<SubmissionEntity>;

@Schema({ timestamps: true })
export class SubmissionEntity {
  @Prop({ type: Types.ObjectId, ref: 'UserEntity', required: true, index: true })
  user_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'SessionEntity', required: true, index: true })
  session_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ChallengeEntity', required: true })
  challenge_id!: Types.ObjectId;

  @Prop({ required: true })
  userCode!: string;

  @Prop({ type: Number, default: null })
  score!: number | null;

  @Prop({ type: String, default: null })
  feedback!: string | null;

  @Prop({ type: String, default: 'pending', enum: ['pending', 'scored', 'failed'] })
  status!: string;

  @Prop({ default: null })
  jobId!: string | null;
}

export const SubmissionSchema = SchemaFactory.createForClass(SubmissionEntity);
