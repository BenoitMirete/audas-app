import { Test, TestingModule } from '@nestjs/testing';
import { TestStatus as PrismaTestStatus } from '@prisma/client';
import { TagsService } from './tags.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  tag: {
    findMany: jest.fn(),
  },
  testResult: {
    count: jest.fn(),
  },
};

describe('TagsService', () => {
  let service: TagsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TagsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<TagsService>(TagsService);
    jest.clearAllMocks();
  });

  describe('findByProject', () => {
    it('returns all tags for a project', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([{ id: 't1', name: 'smoke', projectId: 'p1' }]);
      const result = await service.findByProject('p1');
      expect(result).toHaveLength(1);
      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { projectId: 'p1' } }),
      );
    });
  });

  describe('getTagStats', () => {
    it('returns pass rate per tag for a project', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([{ id: 't1', name: 'smoke' }]);
      mockPrisma.testResult.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8); // passed

      const result = await service.getTagStats('p1');
      expect(result[0]).toHaveProperty('passRate');
      expect(result[0].passRate).toBe(0.8);
      expect(mockPrisma.testResult.count).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ where: expect.objectContaining({ status: PrismaTestStatus.PASSED }) }),
      );
    });
  });
});
