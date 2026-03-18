import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

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

    it('throws ConflictException on P2002 unique constraint violation', async () => {
      const prismaError = new PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      mockPrisma.project.create.mockRejectedValue(prismaError);
      await expect(service.create({ name: 'My Project' })).rejects.toThrow(ConflictException);
    });
  });

  describe('addMember', () => {
    it('upserts a project membership', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.projectMembership.upsert.mockResolvedValue({});
      await expect(service.addMember('p1', 'u1', 'VIEWER')).resolves.not.toThrow();
    });
  });

  describe('update', () => {
    it('calls prisma.project.update with explicit fields', async () => {
      const existing = { id: 'p1', name: 'Old', slug: 'old' };
      const updated = { id: 'p1', name: 'New Name', slug: 'old' };
      mockPrisma.project.findUnique.mockResolvedValue(existing);
      mockPrisma.project.update.mockResolvedValue(updated);
      const result = await service.update('p1', { name: 'New Name' });
      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { name: 'New Name', description: undefined, slackWebhook: undefined },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('deletes the project', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.project.delete.mockResolvedValue({});
      await expect(service.remove('p1')).resolves.not.toThrow();
      expect(mockPrisma.project.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });
  });

  describe('createApiKey', () => {
    it('returns a { key } object with a non-empty string and no keyHash', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.apiKey.create.mockResolvedValue({ id: 'k1' });
      const result = await service.createApiKey('p1', 'my-key');
      expect(result).toHaveProperty('key');
      expect(typeof result.key).toBe('string');
      expect(result.key.length).toBeGreaterThan(0);
      expect(result).not.toHaveProperty('keyHash');
    });
  });

  describe('listApiKeys', () => {
    it('returns array without keyHash field', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: 'p1' });
      const keys = [{ id: 'k1', label: 'ci', createdAt: new Date() }];
      mockPrisma.apiKey.findMany.mockResolvedValue(keys);
      const result = await service.listApiKeys('p1');
      expect(Array.isArray(result)).toBe(true);
      result.forEach((k: Record<string, unknown>) => {
        expect(k).not.toHaveProperty('keyHash');
      });
    });
  });

  describe('deleteApiKey', () => {
    it('resolves without throwing', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.apiKey.delete.mockResolvedValue({});
      await expect(service.deleteApiKey('p1', 'k1')).resolves.not.toThrow();
      expect(mockPrisma.apiKey.delete).toHaveBeenCalledWith({
        where: { id: 'k1', projectId: 'p1' },
      });
    });
  });
});
