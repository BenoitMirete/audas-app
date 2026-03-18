import { Test, TestingModule } from '@nestjs/testing';
import { TestResultsService } from './test-results.service';
import { PrismaService } from '../prisma/prisma.service';
import { TestStatus } from '@audas/shared';

const mockPrisma = {
  testResult: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  tag: {
    upsert: jest.fn(),
  },
  testResultTag: {
    createMany: jest.fn(),
  },
};

describe('TestResultsService', () => {
  let service: TestResultsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TestResultsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<TestResultsService>(TestResultsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a test result', async () => {
      const testResult = { id: 'tr1', runId: 'r1', title: 'login test', status: 'PASSED' };
      mockPrisma.testResult.create.mockResolvedValue(testResult);

      const result = await service.create({
        runId: 'r1',
        projectId: 'p1',
        title: 'login test',
        status: TestStatus.PASSED,
        duration: 1000,
      });

      expect(result.status).toBe('PASSED');
    });

    it('creates tags when tags array is provided', async () => {
      const testResult = { id: 'tr1', runId: 'r1', title: 'test', status: 'PASSED' };
      mockPrisma.testResult.create.mockResolvedValue(testResult);
      mockPrisma.tag.upsert.mockResolvedValue({ id: 'tag1' });
      mockPrisma.testResultTag.createMany.mockResolvedValue({ count: 1 });

      await service.create({
        runId: 'r1',
        projectId: 'p1',
        title: 'test',
        status: TestStatus.PASSED,
        duration: 1000,
        tags: ['smoke'],
      });

      expect(mockPrisma.tag.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name_projectId: { name: 'smoke', projectId: 'p1' } },
        }),
      );
    });
  });

  describe('detectFlakiness', () => {
    it('returns true when last 10 runs have mixed results', async () => {
      mockPrisma.testResult.findMany.mockResolvedValue([
        { status: 'PASSED' },
        { status: 'FAILED' },
        { status: 'PASSED' },
      ]);

      const result = await service.detectFlakiness('p1', 'login test');
      expect(result).toBe(true);
    });

    it('returns false when all results are PASSED', async () => {
      mockPrisma.testResult.findMany.mockResolvedValue([
        { status: 'PASSED' },
        { status: 'PASSED' },
      ]);

      const result = await service.detectFlakiness('p1', 'login test');
      expect(result).toBe(false);
    });
  });

  describe('addArtifact', () => {
    it('appends screenshot path to the array', async () => {
      mockPrisma.testResult.findUnique.mockResolvedValue({
        id: 'tr1',
        screenshots: [],
        videos: [],
        traces: [],
        run: { projectId: 'p1' },
      });
      mockPrisma.testResult.update.mockResolvedValue({
        id: 'tr1',
        screenshots: ['uploads/screenshots/file.png'],
      });

      const result = await service.addArtifact('tr1', 'screenshot', 'uploads/screenshots/file.png');
      expect(mockPrisma.testResult.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { screenshots: ['uploads/screenshots/file.png'] },
        }),
      );
    });
  });
});
