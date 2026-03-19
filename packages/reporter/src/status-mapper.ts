import { TestStatus } from '@audas/shared';

type PlaywrightStatus = 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';

const STATUS_MAP: Record<PlaywrightStatus, TestStatus> = {
  passed: TestStatus.PASSED,
  failed: TestStatus.FAILED,
  timedOut: TestStatus.FAILED,
  skipped: TestStatus.SKIPPED,
  interrupted: TestStatus.FAILED,
};

export function mapStatus(status: PlaywrightStatus): TestStatus {
  return STATUS_MAP[status];
}
