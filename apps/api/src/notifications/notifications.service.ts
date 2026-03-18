import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async notifyRunComplete(
    projectId: string,
    runId: string,
    status: string,
    failedCount: number,
    totalCount: number,
  ): Promise<void> {
    if (status !== 'FAILED') return;

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, slackWebhook: true },
    });

    if (!project?.slackWebhook) return;

    const message = {
      text:
        `*Audas:* Run \`${runId}\` for *${project.name}* completed with status *${status}*.\n` +
        `${failedCount} of ${totalCount} tests failed.`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Audas run failed*\nProject: *${project.name}*\nRun ID: \`${runId}\`\n${failedCount}/${totalCount} tests failed.`,
          },
        },
      ],
    };

    try {
      await axios.post(project.slackWebhook, message);
      this.logger.log(`Slack notification sent for run ${runId}`);
    } catch (err) {
      this.logger.error(`Failed to send Slack notification for run ${runId}`, err);
    }
  }
}
