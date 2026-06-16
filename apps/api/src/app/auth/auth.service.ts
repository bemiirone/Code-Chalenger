import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserEntity, UserDocument } from '../database/schemas/user.schema';

export interface Auth0User {
  auth0Sub: string;
  email: string;
  name?: string;
  picture?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(UserEntity.name) private userModel: Model<UserDocument>,
  ) {}

  async findOrCreateByAuth0Sub(auth0User: Auth0User): Promise<{ _id: string; email: string; displayName: string }> {
    let user = await this.userModel.findOne({ auth0Sub: auth0User.auth0Sub }).exec();

    if (!user) {
      const existingByEmail = await this.userModel.findOne({ email: auth0User.email }).exec();
      if (existingByEmail) {
        existingByEmail.auth0Sub = auth0User.auth0Sub;
        if (auth0User.picture) existingByEmail.picture = auth0User.picture;
        await existingByEmail.save();
        user = existingByEmail;
      } else {
        user = await this.userModel.create({
          email: auth0User.email,
          displayName: auth0User.name || auth0User.email.split('@')[0],
          auth0Sub: auth0User.auth0Sub,
          picture: auth0User.picture,
        });
      }
    }

    return { _id: user._id.toString(), email: user.email, displayName: user.displayName };
  }

  async getProfile(userId: string): Promise<{ _id: string; email: string; displayName: string }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new UnauthorizedException();
    return { _id: user._id.toString(), email: user.email, displayName: user.displayName };
  }
}
