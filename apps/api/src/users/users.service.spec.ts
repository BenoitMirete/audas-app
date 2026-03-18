import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns all users without passwordHash', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: '1', email: 'a@a.com', name: 'A', role: 'VIEWER' },
      ]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        select: expect.objectContaining({ passwordHash: false }),
      });
    });
  });

  describe('findOne', () => {
    it('returns a user by id', async () => {
      const user = { id: '1', email: 'a@a.com', name: 'A', role: 'VIEWER' };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      const result = await service.findOne('1');
      expect(result).toEqual(user);
    });

    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateRole', () => {
    it('updates user role', async () => {
      const updated = { id: '1', email: 'a@a.com', name: 'A', role: 'ADMIN' };
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.user.update.mockResolvedValue(updated);

      const result = await service.updateRole('1', 'ADMIN');
      expect(result.role).toBe('ADMIN');
    });
  });

  describe('remove', () => {
    it('deletes a user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.user.delete.mockResolvedValue({ id: '1' });
      await expect(service.remove('1')).resolves.toBeUndefined();
    });
  });
});
