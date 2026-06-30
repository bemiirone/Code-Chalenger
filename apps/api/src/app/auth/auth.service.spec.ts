import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UnauthorizedException } from '@nestjs/common';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { UserEntity } from '../database/schemas/user.schema';

const mockUser = {
  _id: { toString: () => 'user-id-1' },
  email: 'alice@test.com',
  displayName: 'Alice',
};

describe('AuthService', () => {
  let service: AuthService;
  let userModel: { findById: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    userModel = { findById: vi.fn() };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(UserEntity.name), useValue: userModel },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('getProfile', () => {
    it('returns profile when user exists', async () => {
      userModel.findById.mockReturnValue({ exec: vi.fn().mockResolvedValue(mockUser) });

      const result = await service.getProfile('user-id-1');

      expect(result).toEqual({ _id: 'user-id-1', email: 'alice@test.com', displayName: 'Alice' });
    });

    it('throws UnauthorizedException when user not found', async () => {
      userModel.findById.mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });

      await expect(service.getProfile('nonexistent'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('calls findById with the correct userId', async () => {
      userModel.findById.mockReturnValue({ exec: vi.fn().mockResolvedValue(mockUser) });

      await service.getProfile('user-id-1');

      expect(userModel.findById).toHaveBeenCalledWith('user-id-1');
    });
  });
});
