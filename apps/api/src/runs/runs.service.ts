import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRunDto, RunStatus as SharedRunStatus, CIMetadata } from '@audas/shared';
import { RunStatus as PrismaRunStatus } from '@prisma/client';
import { RunFilterDto } from './dto/run-filter.dto';

const STATUS_MAP: Record<SharedRunStatus, PrismaRunStatus> = {
  [SharedRunStatus.PENDING]: PrismaRunStatus.PENDING,
  [SharedRunStatus.RUNNING]: PrismaRunStatus.RUNNING,
  [SharedRunStatus.PASSED]: PrismaRunStatus.PASSED,
  [SharedRunStatus.FAILED]: PrismaRunStatus.FAILED,
};

const TERMINAL_STATUSES: SharedRunStatus[] = [SharedRunStatus.PASSED, SharedRunStatus.FAILED];

export { RunFilterDto };

@Injectable()
export class RunsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRunDto & { ci?: CIMetadata }) {
    const { projectId, ci } = dto;
    return this.prisma.run.create({
      data: {
        projectId,
        status: PrismaRunStatus.PENDING,
        branch: ci?.branch,
        commitSha: ci?.commitSha,
        commitMessage: ci?.commitMessage,
        pipelineId: ci?.pipelineId,
        pipelineUrl: ci?.pipelineUrl,
        mrId: ci?.mrId,
        mrUrl: ci?.mrUrl,
        triggeredBy: ci?.triggeredBy,
      },
    });
  }

  async findAll(projectId: string, filters: RunFilterDto) {
    const { status, branch, tag, limit = 20, offset = 0 } = filters;

    const where: Prisma.RunWhereInput = { projectId };
    if (status) where.status = STATUS_MAP[status];
    if (branch) where.branch = branch;
    if (tag) {
      where.testResults = {
        some: { tags: { some: { tag: { name: tag } } } },
      };
    }

    return this.prisma.run.findMany({
      where,
      include: {
        _count: { select: { testResults: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async findOne(id: string) {
    const run = await this.prisma.run.findUnique({
      where: { id },
      include: {
        testResults: {
          include: { tags: { include: { tag: true } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { testResults: true } },
      },
    });
    if (!run) throw new NotFoundException(`Run ${id} not found`);
    return run;
  }

  async updateStatus(id: string, status: SharedRunStatus, duration?: number, apiKeyProjectId?: string) {
    const isTerminal = TERMINAL_STATUSES.includes(status);
    try {
      return await this.prisma.run.update({
        where: { id, ...(apiKeyProjectId && { projectId: apiKeyProjectId }) },
        data: {
          status: STATUS_MAP[status],
          ...(isTerminal && { finishedAt: new Date(), duration }),
        },
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException(`Run ${id} not found`);
      }
      throw e;
    }
  }
}
