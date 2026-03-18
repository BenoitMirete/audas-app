import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TestStatus as PrismaTestStatus } from '@prisma/client';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProject(projectId: string) {
    return this.prisma.tag.findMany({
      where: { projectId },
      include: { _count: { select: { testResults: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async getTagStats(projectId: string) {
    const tags = await this.prisma.tag.findMany({
      where: { projectId },
      select: { id: true, name: true },
    });

    const stats = await Promise.all(
      tags.map(async (tag) => {
        const total = await this.prisma.testResult.count({
          where: {
            tags: { some: { tagId: tag.id } },
            run: { projectId },
          },
        });

        const passed = await this.prisma.testResult.count({
          where: {
            tags: { some: { tagId: tag.id } },
            run: { projectId },
            status: PrismaTestStatus.PASSED,
          },
        });

        const passRate = total > 0 ? passed / total : null;
        return { ...tag, total, passed, passRate };
      }),
    );

    return stats;
  }
}
