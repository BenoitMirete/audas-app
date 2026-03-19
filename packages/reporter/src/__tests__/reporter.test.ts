import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import { AudasReporter } from '../reporter.js';

// Mock the API client module so we control all HTTP calls
vi.mock('../api-client.js', () => {
  const AudasApiClient = vi.fn().mockImplementation(() => ({
    createRun: vi.fn().mockResolvedValue('run-mock-id'),
    createTestResult: vi.fn().mockResolvedValue('result-mock-id'),
    finalizeRun: vi.fn().mockResolvedValue(undefined),
    uploadArtifact: vi.fn().mockResolvedValue(undefined),
  }));
  return { AudasApiClient };
});

// Mock CI metadata to return a predictable value
vi.mock('../ci-metadata.js', () => ({
  extractCIMetadata: vi.fn().mockReturnValue(undefined),
}));

import { AudasApiClient } from '../api-client.js';
import { extractCIMetadata } from '../ci-metadata.js';

// Helpers to build minimal Playwright objects for testing
function makeConfig(): FullConfig {
  return {} as FullConfig;
}

function makeSuite(): Suite {
  return {} as Suite;
}

function makeTestCase(overrides: Partial<TestCase> = {}): TestCase {
  return {
    title: 'should work',
    tags: [],
    ...overrides,
  } as unknown as TestCase;
}

function makeTestResult(overrides: Partial<TestResult> = {}): TestResult {
  return {
    status: 'passed',
    duration: 500,
    error: undefined,
    attachments: [],
    ...overrides,
  } as unknown as TestResult;
}

function makeFullResult(status: FullResult['status'] = 'passed'): FullResult {
  return { status, duration: 2000 } as FullResult;
}

describe('AudasReporter', () => {
  const OPTIONS = {
    apiUrl: 'https://audas.example.com',
    apiKey: 'test-key',
    projectId: 'proj-test',
  };

  let apiClientInstance: {
    createRun: ReturnType<typeof vi.fn>;
    createTestResult: ReturnType<typeof vi.fn>;
    finalizeRun: ReturnType<typeof vi.fn>;
    uploadArtifact: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Grab the instance that gets created when the reporter constructs
    apiClientInstance = {
      createRun: vi.fn().mockResolvedValue('run-mock-id'),
      createTestResult: vi.fn().mockResolvedValue('result-mock-id'),
      finalizeRun: vi.fn().mockResolvedValue(undefined),
      uploadArtifact: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(AudasApiClient).mockImplementation(
      () => apiClientInstance as unknown as AudasApiClient,
    );
  });

  describe('enabled option', () => {
    it('does nothing when enabled is false', async () => {
      const reporter = new AudasReporter({ ...OPTIONS, enabled: false });

      await reporter.onBegin(makeConfig(), makeSuite());
      await reporter.onTestEnd(makeTestCase(), makeTestResult());
      await reporter.onEnd(makeFullResult());

      expect(apiClientInstance.createRun).not.toHaveBeenCalled();
      expect(apiClientInstance.createTestResult).not.toHaveBeenCalled();
      expect(apiClientInstance.finalizeRun).not.toHaveBeenCalled();
    });

    it('is enabled by default when option is omitted', async () => {
      const reporter = new AudasReporter(OPTIONS);

      await reporter.onBegin(makeConfig(), makeSuite());

      expect(apiClientInstance.createRun).toHaveBeenCalledOnce();
    });
  });

  describe('onBegin', () => {
    it('calls createRun with projectId', async () => {
      const reporter = new AudasReporter(OPTIONS);

      await reporter.onBegin(makeConfig(), makeSuite());

      expect(apiClientInstance.createRun).toHaveBeenCalledWith({
        projectId: 'proj-test',
      });
    });

    it('includes CI metadata when present', async () => {
      vi.mocked(extractCIMetadata).mockReturnValueOnce({
        branch: 'main',
        commitSha: 'abc123',
      });

      const reporter = new AudasReporter(OPTIONS);
      await reporter.onBegin(makeConfig(), makeSuite());

      expect(apiClientInstance.createRun).toHaveBeenCalledWith({
        projectId: 'proj-test',
        ci: { branch: 'main', commitSha: 'abc123' },
      });
    });

    it('does not throw when createRun rejects — logs to stderr instead', async () => {
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      apiClientInstance.createRun.mockRejectedValueOnce(new Error('API down'));

      const reporter = new AudasReporter(OPTIONS);

      await expect(reporter.onBegin(makeConfig(), makeSuite())).resolves.toBeUndefined();
      expect(stderrSpy).toHaveBeenCalled();
      stderrSpy.mockRestore();
    });
  });

  describe('onTestEnd', () => {
    it('calls createTestResult with mapped fields', async () => {
      const reporter = new AudasReporter(OPTIONS);
      await reporter.onBegin(makeConfig(), makeSuite());

      await reporter.onTestEnd(
        makeTestCase({ title: 'should login', tags: ['@smoke'] }),
        makeTestResult({ status: 'passed', duration: 1200 }),
      );

      expect(apiClientInstance.createTestResult).toHaveBeenCalledWith('run-mock-id', {
        runId: 'run-mock-id',
        title: 'should login',
        status: 'passed',
        duration: 1200,
        tags: ['smoke'],
      });
    });

    it('includes errorMessage and stackTrace on failure', async () => {
      const reporter = new AudasReporter(OPTIONS);
      await reporter.onBegin(makeConfig(), makeSuite());

      await reporter.onTestEnd(
        makeTestCase({ title: 'should fail' }),
        makeTestResult({
          status: 'failed',
          duration: 300,
          error: { message: 'Expected true', stack: 'at line 5' },
        }),
      );

      expect(apiClientInstance.createTestResult).toHaveBeenCalledWith('run-mock-id', {
        runId: 'run-mock-id',
        title: 'should fail',
        status: 'failed',
        duration: 300,
        tags: [],
        errorMessage: 'Expected true',
        stackTrace: 'at line 5',
      });
    });

    it('uploads screenshot attachments', async () => {
      const reporter = new AudasReporter(OPTIONS);
      await reporter.onBegin(makeConfig(), makeSuite());

      const screenshotBuffer = Buffer.from('png-data');

      await reporter.onTestEnd(
        makeTestCase(),
        makeTestResult({
          attachments: [
            {
              name: 'screenshot',
              contentType: 'image/png',
              body: screenshotBuffer,
            },
          ],
        }),
      );

      expect(apiClientInstance.uploadArtifact).toHaveBeenCalledWith('result-mock-id', {
        filename: 'screenshot.png',
        contentType: 'image/png',
        data: screenshotBuffer,
      });
    });

    it('uploads video attachments', async () => {
      const reporter = new AudasReporter(OPTIONS);
      await reporter.onBegin(makeConfig(), makeSuite());

      const videoBuffer = Buffer.from('webm-data');

      await reporter.onTestEnd(
        makeTestCase(),
        makeTestResult({
          attachments: [
            {
              name: 'video',
              contentType: 'video/webm',
              body: videoBuffer,
            },
          ],
        }),
      );

      expect(apiClientInstance.uploadArtifact).toHaveBeenCalledWith('result-mock-id', {
        filename: 'video.webm',
        contentType: 'video/webm',
        data: videoBuffer,
      });
    });

    it('uploads trace attachments', async () => {
      const reporter = new AudasReporter(OPTIONS);
      await reporter.onBegin(makeConfig(), makeSuite());

      const traceBuffer = Buffer.from('zip-data');

      await reporter.onTestEnd(
        makeTestCase(),
        makeTestResult({
          attachments: [
            {
              name: 'trace',
              contentType: 'application/zip',
              body: traceBuffer,
            },
          ],
        }),
      );

      expect(apiClientInstance.uploadArtifact).toHaveBeenCalledWith('result-mock-id', {
        filename: 'trace.zip',
        contentType: 'application/zip',
        data: traceBuffer,
      });
    });

    it('skips attachments without a body buffer', async () => {
      const reporter = new AudasReporter(OPTIONS);
      await reporter.onBegin(makeConfig(), makeSuite());

      await reporter.onTestEnd(
        makeTestCase(),
        makeTestResult({
          attachments: [
            {
              name: 'screenshot',
              contentType: 'image/png',
              // body is undefined — this happens when artifact path is used instead
              path: '/tmp/screenshot.png',
            },
          ],
        }),
      );

      expect(apiClientInstance.uploadArtifact).not.toHaveBeenCalled();
    });

    it('skips unsupported attachment content types', async () => {
      const reporter = new AudasReporter(OPTIONS);
      await reporter.onBegin(makeConfig(), makeSuite());

      await reporter.onTestEnd(
        makeTestCase(),
        makeTestResult({
          attachments: [
            {
              name: 'custom',
              contentType: 'text/plain',
              body: Buffer.from('log data'),
            },
          ],
        }),
      );

      expect(apiClientInstance.uploadArtifact).not.toHaveBeenCalled();
    });

    it('does not throw when createTestResult rejects — logs to stderr', async () => {
      apiClientInstance.createTestResult.mockRejectedValueOnce(new Error('500'));
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      const reporter = new AudasReporter(OPTIONS);
      await reporter.onBegin(makeConfig(), makeSuite());

      await expect(reporter.onTestEnd(makeTestCase(), makeTestResult())).resolves.toBeUndefined();

      expect(stderrSpy).toHaveBeenCalled();
      stderrSpy.mockRestore();
    });

    it('does nothing when reporter is disabled', async () => {
      const reporter = new AudasReporter({ ...OPTIONS, enabled: false });
      await reporter.onTestEnd(makeTestCase(), makeTestResult());
      expect(apiClientInstance.createTestResult).not.toHaveBeenCalled();
    });

    it('does nothing when runId is not set (createRun failed)', async () => {
      apiClientInstance.createRun.mockRejectedValueOnce(new Error('API down'));
      vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      const reporter = new AudasReporter(OPTIONS);
      await reporter.onBegin(makeConfig(), makeSuite());
      await reporter.onTestEnd(makeTestCase(), makeTestResult());

      expect(apiClientInstance.createTestResult).not.toHaveBeenCalled();
    });
  });

  describe('onEnd', () => {
    it('calls finalizeRun with passed status when suite passed', async () => {
      const reporter = new AudasReporter(OPTIONS);
      await reporter.onBegin(makeConfig(), makeSuite());
      await reporter.onEnd(makeFullResult('passed'));

      expect(apiClientInstance.finalizeRun).toHaveBeenCalledWith('run-mock-id', {
        status: 'passed',
        duration: 2000,
      });
    });

    it('calls finalizeRun with failed status when suite failed', async () => {
      const reporter = new AudasReporter(OPTIONS);
      await reporter.onBegin(makeConfig(), makeSuite());
      await reporter.onEnd(makeFullResult('failed'));

      expect(apiClientInstance.finalizeRun).toHaveBeenCalledWith('run-mock-id', {
        status: 'failed',
        duration: 2000,
      });
    });

    it('does not throw when finalizeRun rejects — logs to stderr', async () => {
      apiClientInstance.finalizeRun.mockRejectedValueOnce(new Error('timeout'));
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      const reporter = new AudasReporter(OPTIONS);
      await reporter.onBegin(makeConfig(), makeSuite());

      await expect(reporter.onEnd(makeFullResult())).resolves.toBeUndefined();
      expect(stderrSpy).toHaveBeenCalled();
      stderrSpy.mockRestore();
    });

    it('does nothing when reporter is disabled', async () => {
      const reporter = new AudasReporter({ ...OPTIONS, enabled: false });
      await reporter.onEnd(makeFullResult());
      expect(apiClientInstance.finalizeRun).not.toHaveBeenCalled();
    });

    it('does nothing when runId is not set', async () => {
      apiClientInstance.createRun.mockRejectedValueOnce(new Error('down'));
      vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      const reporter = new AudasReporter(OPTIONS);
      await reporter.onBegin(makeConfig(), makeSuite());
      await reporter.onEnd(makeFullResult());

      expect(apiClientInstance.finalizeRun).not.toHaveBeenCalled();
    });
  });
});
