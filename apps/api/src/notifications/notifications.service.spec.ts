import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockPrisma = {
  project: {
    findUnique: jest.fn(),
  },
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  describe('notifyRunComplete', () => {
    it('sends Slack message when project has webhook and run failed', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'p1',
        name: 'Demo',
        slackWebhook: 'https://hooks.slack.com/services/xxx',
      });
      mockedAxios.post = jest.fn().mockResolvedValue({ status: 200 });

      await service.notifyRunComplete('p1', 'r1', 'FAILED', 3, 10);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/xxx',
        expect.objectContaining({ text: expect.stringContaining('FAILED') }),
      );
    });

    it('does not send notification when run passed', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'p1',
        name: 'Demo',
        slackWebhook: 'https://hooks.slack.com/services/xxx',
      });

      await service.notifyRunComplete('p1', 'r1', 'PASSED', 0, 10);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('does not send notification when project has no webhook', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'p1',
        name: 'Demo',
        slackWebhook: null,
      });

      await service.notifyRunComplete('p1', 'r1', 'FAILED', 3, 10);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('swallows errors so test suite is never blocked', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'p1',
        name: 'Demo',
        slackWebhook: 'https://hooks.slack.com/services/xxx',
      });
      mockedAxios.post = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(service.notifyRunComplete('p1', 'r1', 'FAILED', 3, 10)).resolves.not.toThrow();
    });
  });
});
