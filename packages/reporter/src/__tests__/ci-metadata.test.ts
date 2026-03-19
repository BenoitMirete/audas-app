import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { CIMetadata } from '@audas/shared';

// We import the function fresh each test to avoid module caching env reads.
// Instead of re-importing, we mock process.env directly since the function
// reads process.env at call time (not at import time).
import { extractCIMetadata } from '../ci-metadata.js';

describe('extractCIMetadata', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset to a clean env before each test
    process.env = { ...originalEnv };
    // Clear all GitLab CI vars
    delete process.env.CI_COMMIT_REF_NAME;
    delete process.env.CI_COMMIT_SHA;
    delete process.env.CI_COMMIT_MESSAGE;
    delete process.env.CI_PIPELINE_ID;
    delete process.env.CI_PIPELINE_URL;
    delete process.env.CI_MERGE_REQUEST_IID;
    delete process.env.CI_MERGE_REQUEST_PROJECT_URL;
    delete process.env.GITLAB_USER_NAME;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns undefined when no CI env vars are set', () => {
    expect(extractCIMetadata()).toBeUndefined();
  });

  it('returns CIMetadata when CI_COMMIT_SHA is set', () => {
    process.env.CI_COMMIT_SHA = 'abc123def456';
    const result = extractCIMetadata();
    expect(result).toBeDefined();
    expect(result?.commitSha).toBe('abc123def456');
  });

  it('maps all GitLab CI env vars to CIMetadata fields', () => {
    process.env.CI_COMMIT_REF_NAME = 'feature/my-branch';
    process.env.CI_COMMIT_SHA = 'deadbeef';
    process.env.CI_COMMIT_MESSAGE = 'fix: broken test';
    process.env.CI_PIPELINE_ID = '999';
    process.env.CI_PIPELINE_URL = 'https://gitlab.com/org/repo/-/pipelines/999';
    process.env.CI_MERGE_REQUEST_IID = '42';
    process.env.CI_MERGE_REQUEST_PROJECT_URL = 'https://gitlab.com/org/repo/-/merge_requests/42';
    process.env.GITLAB_USER_NAME = 'alice';

    const result = extractCIMetadata();

    expect(result).toEqual<CIMetadata>({
      branch: 'feature/my-branch',
      commitSha: 'deadbeef',
      commitMessage: 'fix: broken test',
      pipelineId: '999',
      pipelineUrl: 'https://gitlab.com/org/repo/-/pipelines/999',
      mrId: '42',
      mrUrl: 'https://gitlab.com/org/repo/-/merge_requests/42',
      triggeredBy: 'alice',
    });
  });

  it('only includes fields whose env vars are set', () => {
    process.env.CI_COMMIT_SHA = 'abc';
    process.env.CI_COMMIT_REF_NAME = 'main';

    const result = extractCIMetadata();

    expect(result?.commitSha).toBe('abc');
    expect(result?.branch).toBe('main');
    expect(result?.pipelineId).toBeUndefined();
    expect(result?.mrId).toBeUndefined();
    expect(result?.triggeredBy).toBeUndefined();
  });

  it('returns undefined when all set values are empty strings', () => {
    process.env.CI_COMMIT_SHA = '';
    expect(extractCIMetadata()).toBeUndefined();
  });
});
