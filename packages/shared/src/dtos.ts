import { type TestStatus } from './enums.js';

export interface CIMetadata {
  branch?: string;
  commitSha?: string;
  commitMessage?: string;
  pipelineId?: string;
  pipelineUrl?: string;
  mrId?: string;
  mrUrl?: string;
  triggeredBy?: string;
}

export interface TagDto {
  name: string;
}

export interface CreateRunDto {
  projectId: string;
  ci?: CIMetadata;
}

export interface CreateTestResultDto {
  runId: string;
  title: string;
  status: TestStatus;
  duration: number;
  errorMessage?: string;
  stackTrace?: string;
  tags?: string[];
}
