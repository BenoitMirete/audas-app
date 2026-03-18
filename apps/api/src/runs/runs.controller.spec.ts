import { Test, TestingModule } from '@nestjs/testing';
import { RunsController } from './runs.controller';
import { RunsService } from './runs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { RunStatus } from '@audas/shared';

const mockService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  updateStatus: jest.fn(),
};

const mockGuard = { canActivate: jest.fn(() => true) };

describe('RunsController', () => {
  let controller: RunsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RunsController],
      providers: [{ provide: RunsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(ApiKeyGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<RunsController>(RunsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('POST /runs creates a run', async () => {
    mockService.create.mockResolvedValue({ id: 'r1', status: 'PENDING' });
    const result = await controller.create({ projectId: 'p1' });
    expect(result.status).toBe('PENDING');
  });

  it('PATCH /runs/:id/status updates status', async () => {
    mockService.updateStatus.mockResolvedValue({ id: 'r1', status: 'PASSED' });
    const result = await controller.updateStatus('r1', { status: RunStatus.PASSED });
    expect(result.status).toBe('PASSED');
  });

  it('GET /runs/project/:projectId returns runs', async () => {
    mockService.findAll.mockResolvedValue([{ id: 'r1' }]);
    const result = await controller.findAll('p1', {});
    expect(result).toHaveLength(1);
  });

  it('GET /runs/:id returns run detail', async () => {
    mockService.findOne.mockResolvedValue({ id: 'r1' });
    const result = await controller.findOne('r1');
    expect(result).toEqual({ id: 'r1' });
  });
});
