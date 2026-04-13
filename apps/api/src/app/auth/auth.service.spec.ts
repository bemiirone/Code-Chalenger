import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { vi } from 'vitest';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserEntity } from '../database/schemas/user.schema';

vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('hashed-password'),
  compare: vi.fn().mockResolvedValue(false),
}));

const mockUser = {
  _id: { toString: () => 'user-id-1' },
  email: 'alice@test.com',
  displayName: 'Alice',
  passwordHash: 'hashed-secret',
};

describe('AuthService', () => {
  let service: AuthService;
  let userModel: { findOne: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  let jwtService: { sign: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    userModel = { findOne: vi.fn(), create: vi.fn() };
    jwtService = { sign: vi.fn().mockReturnValue('signed-jwt') };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(UserEntity.name), useValue: userModel },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('throws ConflictException when email already exists', async () => {
      userModel.findOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(mockUser) });
      await expect(service.register({ email: 'alice@test.com', password: 'pass', displayName: 'Alice' }))
        .rejects.toThrow(ConflictException);
    });

    it('hashes the password with cost 12 before storing', async () => {
      userModel.findOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });
      userModel.create.mockResolvedValue(mockUser);

      await service.register({ email: 'alice@test.com', password: 'plaintext', displayName: 'Alice' });

      expect(bcrypt.hash).toHaveBeenCalledWith('plaintext', 12);
    });

    it('returns access_token and user on success', async () => {
      userModel.findOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });
      userModel.create.mockResolvedValue(mockUser);

      const result = await service.register({ email: 'alice@test.com', password: 'pass', displayName: 'Alice' });

      expect(result.access_token).toBe('signed-jwt');
      expect(result.user.email).toBe('alice@test.com');
      expect(result.user.displayName).toBe('Alice');
    });

    it('signs a JWT with sub and email', async () => {
      userModel.findOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });
      userModel.create.mockResolvedValue(mockUser);

      await service.register({ email: 'alice@test.com', password: 'pass', displayName: 'Alice' });

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-id-1', email: 'alice@test.com' })
      );
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when user not found', async () => {
      userModel.findOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });
      await expect(service.login({ email: 'nobody@test.com', password: 'pass' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      userModel.findOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(mockUser) });
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
      await expect(service.login({ email: 'alice@test.com', password: 'wrong' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('returns access_token and user when credentials are valid', async () => {
      userModel.findOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(mockUser) });
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await service.login({ email: 'alice@test.com', password: 'secret' });

      expect(result.access_token).toBe('signed-jwt');
      expect(result.user.email).toBe('alice@test.com');
    });

    it('signs a JWT with sub and email on successful login', async () => {
      userModel.findOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(mockUser) });
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await service.login({ email: 'alice@test.com', password: 'secret' });

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-id-1', email: 'alice@test.com' })
      );
    });
  });
});
