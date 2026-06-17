import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserEntity, UserDocument } from '../database/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(UserEntity.name) private userModel: Model<UserDocument>,
  ) {}

  async getProfile(userId: string): Promise<{ _id: string; email: string; displayName: string }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new UnauthorizedException();
    return { _id: user._id.toString(), email: user.email, displayName: user.displayName };
  }
}
