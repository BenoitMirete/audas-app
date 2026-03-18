import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  project: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  projectMembership: {
    upsert: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },
  apiKey: {
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
};

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProjectsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns all projects', async () => {
      mockPrisma.project.findMany.mockResolvedValue([{ id: 'p1', name: 'Test' }]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when not found', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns project when found', async () => {
      const project = { id: 'p1', name: 'Test', slug: 'test' };
      mockPrisma.project.findUnique.mockResolvedValue(project);
      const result = await service.findOne('p1');
      expect(result).toEqual(project);
    });
  });

  describe('create', () => {
    it('creates a project with slugified name', async () => {
      const project = { id: 'p1', name: 'My Project', slug: 'my-project' };
      mockPrisma.project.create.mockResolvedValue(project);
      const result = await service.create({ name: 'My Project' });
      expect(result.slug).toBe('my-project');
    });
  });

  describe('addMember', () => {
    it('upserts a project membership', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.projectMembership.upsert.mockResolvedValue({});
      await expect(service.addMember('p1', 'u1', 'VIEWER')).resolves.not.toThrow();
    });
  });
});
