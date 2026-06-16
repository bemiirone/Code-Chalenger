import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<UserEntity>;

@Schema({ timestamps: true })
export class UserEntity {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: false })
  passwordHash?: string;

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({ required: true, unique: true, trim: true })
  auth0Sub!: string;

  @Prop({ required: false })
  picture?: string;
}

export const UserSchema = SchemaFactory.createForClass(UserEntity);
