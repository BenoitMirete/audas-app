import { Test, TestingModule } from '@nestjs/testing';
import { RunsService } from './runs.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { RunStatus } from '@audas/shared';

const mockPrisma = {
  run: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('RunsService', () => {
  let service: RunsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RunsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<RunsService>(RunsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a run with PENDING status', async () => {
      const run = { id: 'r1', projectId: 'p1', status: 'PENDING' };
      mockPrisma.run.create.mockResolvedValue(run);

      const result = await service.create({ projectId: 'p1' });
      expect(result.status).toBe('PENDING');
      expect(mockPrisma.run.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ projectId: 'p1', status: 'PENDING' }),
        }),
      );
    });

    it('stores CI metadata when provided', async () => {
      const run = { id: 'r1', projectId: 'p1', status: 'PENDING', branch: 'main' };
      mockPrisma.run.create.mockResolvedValue(run);

      const result = await service.create({ projectId: 'p1', ci: { branch: 'main' } });
      expect(result.branch).toBe('main');
    });
  });

  describe('findAll', () => {
    it('returns runs for a project', async () => {
      mockPrisma.run.findMany.mockResolvedValue([{ id: 'r1' }]);
      const result = await service.findAll('p1', {});
      expect(result).toHaveLength(1);
    });

    it('filters by status', async () => {
      mockPrisma.run.findMany.mockResolvedValue([]);
      await service.findAll('p1', { status: RunStatus.FAILED });
      expect(mockPrisma.run.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'FAILED' }),
        }),
      );
    });

    it('filters by branch', async () => {
      mockPrisma.run.findMany.mockResolvedValue([]);
      await service.findAll('p1', { branch: 'main' });
      expect(mockPrisma.run.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ branch: 'main' }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when not found', async () => {
      mockPrisma.run.findUnique.mockResolvedValue(null);
      await expect(service.findOne('r1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('updates run status and sets finishedAt when terminal', async () => {
      mockPrisma.run.findUnique.mockResolvedValue({ id: 'r1', status: 'RUNNING' });
      mockPrisma.run.update.mockResolvedValue({
        id: 'r1',
        status: 'PASSED',
        finishedAt: new Date(),
      });

      const result = await service.updateStatus('r1', RunStatus.PASSED, 5000);
      expect(result.status).toBe('PASSED');
      expect(mockPrisma.run.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PASSED',
            finishedAt: expect.any(Date),
            duration: 5000,
          }),
        }),
      );
    });
  });
});
