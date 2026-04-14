import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UserEntity, UserDocument } from '../database/schemas/user.schema';
import { RegisterDto, LoginDto, AuthResponse } from '@code-challenger/shared';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(UserEntity.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.userModel.findOne({ email: dto.email }).exec();
    if (existing) {
      throw new ConflictException('Email already in use');
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.userModel.create({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
    });
    const token = this.jwtService.sign({ sub: user._id.toString(), email: user.email });
    return {
      access_token: token,
      user: { _id: user._id.toString(), email: user.email, displayName: user.displayName },
    };
  }

  async getProfile(userId: string): Promise<{ _id: string; email: string; displayName: string }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new UnauthorizedException();
    return { _id: user._id.toString(), email: user.email, displayName: user.displayName };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userModel.findOne({ email: dto.email }).exec();
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = this.jwtService.sign({ sub: user._id.toString(), email: user.email });
    return {
      access_token: token,
      user: { _id: user._id.toString(), email: user.email, displayName: user.displayName },
    };
  }
}
