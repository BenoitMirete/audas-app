import { Test, TestingModule } from '@nestjs/testing';
import { TestResultsController } from './test-results.controller';
import { TestResultsService } from './test-results.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { TestStatus } from '@audas/shared';

const mockService = {
  create: jest.fn(),
  findByRun: jest.fn(),
  findOne: jest.fn(),
  addArtifact: jest.fn(),
  detectFlakiness: jest.fn(),
};

const mockGuard = { canActivate: jest.fn(() => true) };

describe('TestResultsController', () => {
  let controller: TestResultsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestResultsController],
      providers: [{ provide: TestResultsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(ApiKeyGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<TestResultsController>(TestResultsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('POST /test-results creates a test result using apiKeyProjectId', async () => {
    mockService.create.mockResolvedValue({ id: 'tr1', status: 'PASSED' });
    const req = { apiKeyProjectId: 'p1' };
    const dto = { runId: 'r1', projectId: 'ignored', title: 'test', status: TestStatus.PASSED, duration: 1000 };
    const result = await controller.create(dto as any, req);
    expect(mockService.create).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'p1' }));
  });

  it('GET /test-results/run/:runId returns results', async () => {
    mockService.findByRun.mockResolvedValue([{ id: 'tr1' }]);
    const result = await controller.findByRun('r1');
    expect(result).toHaveLength(1);
  });

  it('GET /test-results/:id returns one result', async () => {
    mockService.findOne.mockResolvedValue({ id: 'tr1' });
    const result = await controller.findOne('tr1');
    expect(result).toEqual({ id: 'tr1' });
  });
});
