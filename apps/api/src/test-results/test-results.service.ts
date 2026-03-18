import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestResultDto, TestStatus as SharedTestStatus } from '@audas/shared';
import { TestStatus as PrismaTestStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const TEST_STATUS_MAP: Record<SharedTestStatus, PrismaTestStatus> = {
  [SharedTestStatus.PASSED]: PrismaTestStatus.PASSED,
  [SharedTestStatus.FAILED]: PrismaTestStatus.FAILED,
  [SharedTestStatus.SKIPPED]: PrismaTestStatus.SKIPPED,
  [SharedTestStatus.FLAKY]: PrismaTestStatus.FLAKY,
};

export interface CreateTestResultInput extends CreateTestResultDto {
  projectId: string;
}

@Injectable()
export class TestResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTestResultInput) {
    const { projectId, tags, runId, title, status, duration, errorMessage, stackTrace } = dto;

    const testResult = await this.prisma.testResult.create({
      data: {
        runId,
        title,
        status: TEST_STATUS_MAP[status],
        duration,
        errorMessage,
        stackTrace,
      },
    });

    if (tags && tags.length > 0) {
      const tagRecords = await Promise.all(
        tags.map((name) =>
          this.prisma.tag.upsert({
            where: { name_projectId: { name, projectId } },
            update: {},
            create: { name, projectId },
          }),
        ),
      );

      await this.prisma.testResultTag.createMany({
        data: tagRecords.map((tag) => ({ testResultId: testResult.id, tagId: tag.id })),
        skipDuplicates: true,
      });
    }

    return testResult;
  }

  async findByRun(runId: string) {
    return this.prisma.testResult.findMany({
      where: { runId },
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const result = await this.prisma.testResult.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } } },
    });
    if (!result) throw new NotFoundException(`TestResult ${id} not found`);
    return result;
  }

  async detectFlakiness(projectId: string, title: string): Promise<boolean> {
    const recent = await this.prisma.testResult.findMany({
      where: {
        title,
        run: { projectId },
        status: { not: PrismaTestStatus.SKIPPED },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { status: true },
    });

    if (recent.length < 2) return false;

    const statuses = new Set(recent.map((r) => r.status));
    return statuses.has(PrismaTestStatus.PASSED) && statuses.has(PrismaTestStatus.FAILED);
  }

  async addArtifact(
    testResultId: string,
    type: 'screenshot' | 'video' | 'trace',
    filePath: string,
  ) {
    const existing = await this.prisma.testResult.findUnique({
      where: { id: testResultId },
      select: { screenshots: true, videos: true, traces: true },
    });
    if (!existing) throw new NotFoundException(`TestResult ${testResultId} not found`);

    const fieldMap = {
      screenshot: 'screenshots',
      video: 'videos',
      trace: 'traces',
    } as const;

    const field = fieldMap[type];
    const current: string[] = existing[field] ?? [];

    return this.prisma.testResult.update({
      where: { id: testResultId },
      data: { [field]: [...current, filePath] },
    });
  }
}
