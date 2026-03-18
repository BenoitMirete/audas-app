import { RunStatus } from '@audas/shared';

export interface RunFilterDto {
  status?: RunStatus;
  branch?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}
