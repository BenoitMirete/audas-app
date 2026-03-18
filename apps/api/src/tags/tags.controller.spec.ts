import { Test, TestingModule } from '@nestjs/testing';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

const mockService = {
  findByProject: jest.fn(),
  getTagStats: jest.fn(),
};

describe('TagsController', () => {
  let controller: TagsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagsController],
      providers: [{ provide: TagsService, useValue: mockService }],
    }).compile();

    controller = module.get<TagsController>(TagsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('GET /tags/project/:projectId returns tags', async () => {
    mockService.findByProject.mockResolvedValue([{ id: 't1', name: 'smoke' }]);
    const result = await controller.findByProject('p1');
    expect(result).toHaveLength(1);
  });

  it('GET /tags/project/:projectId/stats returns stats', async () => {
    mockService.getTagStats.mockResolvedValue([{ id: 't1', passRate: 0.8 }]);
    const result = await controller.getTagStats('p1');
    expect(result[0].passRate).toBe(0.8);
  });
});
