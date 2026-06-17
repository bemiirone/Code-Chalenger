import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Auth0Strategy } from './strategies/auth0.strategy';
import { UserEntity, UserSchema } from '../database/schemas/user.schema';

@Module({
  imports: [
    PassportModule,
    MongooseModule.forFeature([{ name: UserEntity.name, schema: UserSchema }]),
  ],
  controllers: [AuthController],
  providers: [AuthService, Auth0Strategy],
  exports: [],
})
export class AuthModule {}
