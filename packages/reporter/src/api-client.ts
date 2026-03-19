import axios, { type AxiosInstance } from 'axios';
import FormData from 'form-data';
import type { CreateRunDto, CreateTestResultDto, RunStatus } from '@audas/shared';

export interface FinalizeRunPayload {
  status: RunStatus;
  duration: number;
}

export interface ArtifactPayload {
  filename: string;
  contentType: string;
  data: Buffer;
}

/**
 * Typed axios wrapper for the Audas API.
 * All methods throw on HTTP errors — callers are responsible for catching.
 */
export class AudasApiClient {
  private readonly http: AxiosInstance;

  constructor(baseURL: string, apiKey: string) {
    this.http = axios.create({
      baseURL,
      headers: {
        'x-api-key': apiKey,
      },
    });
  }

  /**
   * Creates a new Run on the API.
   * Returns the server-assigned run ID.
   */
  async createRun(dto: CreateRunDto): Promise<string> {
    const response = await this.http.post<{ id: string }>('/runs', dto);
    return response.data.id;
  }

  /**
   * Creates a TestResult under an existing Run.
   * Returns the server-assigned test result ID.
   */
  async createTestResult(runId: string, dto: CreateTestResultDto): Promise<string> {
    const response = await this.http.post<{ id: string }>(`/runs/${runId}/test-results`, dto);
    return response.data.id;
  }

  /**
   * Updates the Run with its final status and total duration.
   */
  async finalizeRun(runId: string, payload: FinalizeRunPayload): Promise<void> {
    await this.http.patch(`/runs/${runId}`, payload);
  }

  /**
   * Uploads a single artifact (screenshot, video, trace) as multipart form data.
   */
  async uploadArtifact(testResultId: string, artifact: ArtifactPayload): Promise<void> {
    const form = new FormData();
    form.append('file', artifact.data, {
      filename: artifact.filename,
      contentType: artifact.contentType,
    });

    const rawHeaders = form.getHeaders();
    // Normalize header keys to title-case so axios consumers see standard casing
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawHeaders)) {
      const titleKey = key
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('-');
      headers[titleKey] = value as string;
    }

    await this.http.post(`/test-results/${testResultId}/artifacts`, form, { headers });
  }
}
