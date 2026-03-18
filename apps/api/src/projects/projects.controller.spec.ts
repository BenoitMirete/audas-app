import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { Role } from '@prisma/client';

const mockService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  addMember: jest.fn(),
  removeMember: jest.fn(),
  createApiKey: jest.fn(),
  listApiKeys: jest.fn(),
  deleteApiKey: jest.fn(),
};

describe('ProjectsController', () => {
  let controller: ProjectsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: mockService }],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('GET /projects returns all projects', async () => {
    mockService.findAll.mockResolvedValue([{ id: 'p1' }]);
    const result = await controller.findAll();
    expect(result).toHaveLength(1);
  });

  it('GET /projects/:id returns one project', async () => {
    mockService.findOne.mockResolvedValue({ id: 'p1' });
    const result = await controller.findOne('p1');
    expect(result).toEqual({ id: 'p1' });
  });

  it('POST /projects creates a project', async () => {
    mockService.create.mockResolvedValue({ id: 'p1', name: 'Test' });
    const result = await controller.create({ name: 'Test' });
    expect(result.name).toBe('Test');
  });

  it('PATCH /projects/:id updates a project', async () => {
    mockService.update.mockResolvedValue({ id: 'p1', name: 'Updated' });
    const result = await controller.update('p1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });

  it('POST /projects/:id/members adds a member', async () => {
    mockService.addMember.mockResolvedValue({});
    await expect(
      controller.addMember('p1', { userId: 'u1', role: Role.VIEWER }),
    ).resolves.not.toThrow();
  });

  it('POST /projects/:id/api-keys creates an API key', async () => {
    mockService.createApiKey.mockResolvedValue({ key: 'abc123' });
    const result = await controller.createApiKey('p1', {});
    expect(result.key).toBe('abc123');
  });
});
