import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.project.findMany({
      include: { _count: { select: { runs: true, members: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, name: true, role: true } } },
        },
        _count: { select: { runs: true, members: true } },
      },
    });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  async create(dto: CreateProjectDto) {
    const slug = slugify(dto.name);
    try {
      return await this.prisma.project.create({
        data: { name: dto.name, slug, description: dto.description, slackWebhook: dto.slackWebhook },
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Project with slug "${slug}" already exists`);
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.findOne(id);
    return this.prisma.project.update({
      where: { id },
      data: { name: dto.name, description: dto.description, slackWebhook: dto.slackWebhook },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.project.delete({ where: { id } });
  }

  async addMember(projectId: string, userId: string, role: Role) {
    await this.findOne(projectId);
    return this.prisma.projectMembership.upsert({
      where: { userId_projectId: { userId, projectId } },
      update: { role },
      create: { userId, projectId, role },
    });
  }

  async removeMember(projectId: string, userId: string) {
    await this.findOne(projectId);
    await this.prisma.projectMembership.delete({
      where: { userId_projectId: { userId, projectId } },
    });
  }

  async createApiKey(projectId: string, label?: string): Promise<{ key: string }> {
    await this.findOne(projectId);
    const rawKey = uuidv4().replace(/-/g, '');
    const keyHash = await bcrypt.hash(rawKey, 10);
    await this.prisma.apiKey.create({ data: { projectId, keyHash, label } });
    return { key: rawKey };
  }

  async listApiKeys(projectId: string) {
    await this.findOne(projectId);
    return this.prisma.apiKey.findMany({
      where: { projectId },
      select: { id: true, label: true, createdAt: true },
    });
  }

  async deleteApiKey(projectId: string, keyId: string) {
    await this.findOne(projectId);
    await this.prisma.apiKey.delete({ where: { id: keyId, projectId } });
  }
}
