import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import { RunStatus } from '@audas/shared';
import type { CreateTestResultDto } from '@audas/shared';
import { AudasApiClient } from './api-client.js';
import { extractCIMetadata } from './ci-metadata.js';
import { extractTags } from './tag-extractor.js';
import { mapStatus } from './status-mapper.js';

export interface AudasReporterOptions {
  apiUrl: string;
  apiKey: string;
  projectId: string;
  enabled?: boolean;
}

/** Content types we support uploading as artifacts. */
const SUPPORTED_ARTIFACT_TYPES = new Set(['image/png', 'video/webm', 'application/zip']);

/** Map a supported content type to a canonical file extension. */
const EXTENSION_MAP: Record<string, string> = {
  'image/png': 'png',
  'video/webm': 'webm',
  'application/zip': 'zip',
};

/**
 * Maps a Playwright FullResult status to our RunStatus enum.
 * Any non-passed outcome is considered failed.
 */
function mapRunStatus(status: FullResult['status']): RunStatus {
  return status === 'passed' ? RunStatus.PASSED : RunStatus.FAILED;
}

/**
 * Writes an error message to stderr without throwing.
 */
function logError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[audas-reporter] ${context}: ${message}\n`);
}

/**
 * AudasReporter — custom Playwright reporter that ships test results to the
 * Audas API. All network errors are caught and logged to stderr so the reporter
 * can never cause a test suite to fail.
 */
export class AudasReporter implements Reporter {
  private readonly enabled: boolean;
  private readonly client: AudasApiClient;
  private readonly projectId: string;
  private runId: string | undefined;

  constructor(options: AudasReporterOptions) {
    this.enabled = options.enabled !== false;
    this.projectId = options.projectId;
    this.client = new AudasApiClient(options.apiUrl, options.apiKey);
  }

  async onBegin(_config: FullConfig, _suite: Suite): Promise<void> {
    if (!this.enabled) return;

    try {
      const ci = extractCIMetadata();
      this.runId = await this.client.createRun({
        projectId: this.projectId,
        ...(ci ? { ci } : {}),
      });
    } catch (error) {
      logError('onBegin: failed to create run', error);
    }
  }

  async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    if (!this.enabled || !this.runId) return;

    const runId = this.runId;
    let testResultId: string | undefined;

    try {
      const dto: CreateTestResultDto = {
        runId,
        title: test.title,
        status: mapStatus(result.status),
        duration: result.duration,
        tags: extractTags(test.tags),
        ...(result.error?.message ? { errorMessage: result.error.message } : {}),
        ...(result.error?.stack ? { stackTrace: result.error.stack } : {}),
      };

      testResultId = await this.client.createTestResult(runId, dto);
    } catch (error) {
      logError('onTestEnd: failed to create test result', error);
      return;
    }

    // Upload artifacts in parallel — failures are individually caught
    const supportedAttachments = result.attachments.filter(
      (a) => a.body instanceof Buffer && SUPPORTED_ARTIFACT_TYPES.has(a.contentType),
    );

    await Promise.all(
      supportedAttachments.map(async (attachment) => {
        const ext = EXTENSION_MAP[attachment.contentType];
        try {
          await this.client.uploadArtifact(testResultId!, {
            filename: `${attachment.name}.${ext}`,
            contentType: attachment.contentType,
            data: attachment.body as Buffer,
          });
        } catch (error) {
          logError(`onTestEnd: failed to upload artifact '${attachment.name}'`, error);
        }
      }),
    );
  }

  async onEnd(result: FullResult): Promise<void> {
    if (!this.enabled || !this.runId) return;

    try {
      await this.client.finalizeRun(this.runId, {
        status: mapRunStatus(result.status),
        duration: result.duration,
      });
    } catch (error) {
      logError('onEnd: failed to finalize run', error);
    }
  }
}
