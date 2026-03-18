// This file verifies all public types are exported and well-formed.
// It is a compile-time test — if it compiles, types are correct.

import {
  RunStatus,
  TestStatus,
  type CIMetadata,
  type TagDto,
  type CreateRunDto,
  type CreateTestResultDto,
} from '../index.js';

// RunStatus exhaustiveness
const _run: RunStatus = RunStatus.PENDING;
const _allRunStatuses: RunStatus[] = [
  RunStatus.PENDING,
  RunStatus.RUNNING,
  RunStatus.PASSED,
  RunStatus.FAILED,
];

// TestStatus exhaustiveness
const _test: TestStatus = TestStatus.PASSED;
const _allTestStatuses: TestStatus[] = [
  TestStatus.PASSED,
  TestStatus.FAILED,
  TestStatus.SKIPPED,
  TestStatus.FLAKY,
];

// CIMetadata — all fields optional
const _ci: CIMetadata = {};
const _ciFull: CIMetadata = {
  branch: 'main',
  commitSha: 'abc123',
  commitMessage: 'fix: something',
  pipelineId: '42',
  pipelineUrl: 'https://gitlab.com/...',
  mrId: '7',
  mrUrl: 'https://gitlab.com/...',
  triggeredBy: 'alice',
};

// TagDto
const _tag: TagDto = { name: 'smoke' };

// CreateRunDto
const _createRun: CreateRunDto = { projectId: 'proj-1' };
const _createRunWithCI: CreateRunDto = { projectId: 'proj-1', ci: _ciFull };

// CreateTestResultDto
const _createResult: CreateTestResultDto = {
  runId: 'run-1',
  title: 'should login',
  status: TestStatus.PASSED,
  duration: 1200,
};
const _createResultFull: CreateTestResultDto = {
  runId: 'run-1',
  title: 'should login',
  status: TestStatus.FAILED,
  duration: 1200,
  errorMessage: 'Expected true to be false',
  stackTrace: 'at ...',
  tags: ['smoke', 'auth'],
};

// suppress unused variable warnings
void [_run, _allRunStatuses, _test, _allTestStatuses, _ci, _ciFull, _tag, _createRun, _createRunWithCI, _createResult, _createResultFull];
