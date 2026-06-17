import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserEntity, UserDocument } from '../../database/schemas/user.schema';

export interface Auth0JwtPayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  iss: string;
  aud: string;
}

@Injectable()
export class Auth0Strategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectModel(UserEntity.name) private userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${config.getOrThrow<string>('AUTH0_DOMAIN')}/.well-known/jwks.json`,
      }),
      audience: config.getOrThrow<string>('AUTH0_AUDIENCE'),
      issuer: `https://${config.getOrThrow<string>('AUTH0_DOMAIN')}/`,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: Auth0JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    let user = await this.userModel.findOne({ auth0Sub: payload.sub }).exec();

    if (!user) {
      const email = payload.email || `${payload.sub}@auth0.local`;
      const existingByEmail = payload.email ? await this.userModel.findOne({ email: payload.email }).exec() : null;
      if (existingByEmail) {
        existingByEmail.auth0Sub = payload.sub;
        if (payload.picture) existingByEmail.picture = payload.picture;
        await existingByEmail.save();
        user = existingByEmail;
      } else {
        user = await this.userModel.create({
          email,
          displayName: payload.name || email.split('@')[0],
          auth0Sub: payload.sub,
          picture: payload.picture,
        });
      }
    }

    return {
      userId: user._id.toString(),
      email: user.email,
      auth0Sub: user.auth0Sub,
    };
  }
}
