import { describe, it, expect, vi, beforeEach, type MockInstance } from 'vitest';
import axios from 'axios';
import FormData from 'form-data';
import { TestStatus, RunStatus } from '@audas/shared';
import { AudasApiClient } from '../api-client.js';

vi.mock('axios');

const mockedAxios = vi.mocked(axios, true);

describe('AudasApiClient', () => {
  const BASE_URL = 'https://audas.example.com';
  const API_KEY = 'test-api-key';

  let client: AudasApiClient;
  let postSpy: MockInstance;
  let patchSpy: MockInstance;

  beforeEach(() => {
    vi.resetAllMocks();

    // axios.create() returns a new axios instance — mock it
    const mockInstance = {
      post: vi.fn(),
      patch: vi.fn(),
    };
    mockedAxios.create = vi.fn().mockReturnValue(mockInstance);

    client = new AudasApiClient(BASE_URL, API_KEY);
    postSpy = mockInstance.post as MockInstance;
    patchSpy = mockInstance.patch as MockInstance;
  });

  describe('constructor', () => {
    it('creates an axios instance with the correct baseURL and auth header', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: BASE_URL,
        headers: {
          'x-api-key': API_KEY,
        },
      });
    });
  });

  describe('createRun', () => {
    it('POSTs to /runs with projectId and returns the run id', async () => {
      postSpy.mockResolvedValueOnce({ data: { id: 'run-abc' } });

      const runId = await client.createRun({
        projectId: 'proj-1',
      });

      expect(postSpy).toHaveBeenCalledWith('/runs', { projectId: 'proj-1' });
      expect(runId).toBe('run-abc');
    });

    it('POSTs CI metadata when provided', async () => {
      postSpy.mockResolvedValueOnce({ data: { id: 'run-xyz' } });

      await client.createRun({
        projectId: 'proj-1',
        ci: { branch: 'main', commitSha: 'abc123' },
      });

      expect(postSpy).toHaveBeenCalledWith('/runs', {
        projectId: 'proj-1',
        ci: { branch: 'main', commitSha: 'abc123' },
      });
    });

    it('propagates axios errors', async () => {
      postSpy.mockRejectedValueOnce(new Error('Network error'));
      await expect(client.createRun({ projectId: 'proj-1' })).rejects.toThrow('Network error');
    });
  });

  describe('createTestResult', () => {
    it('POSTs to /runs/:runId/test-results and returns the result id', async () => {
      postSpy.mockResolvedValueOnce({ data: { id: 'result-1' } });

      const resultId = await client.createTestResult('run-abc', {
        runId: 'run-abc',
        title: 'should login',
        status: TestStatus.PASSED,
        duration: 1234,
      });

      expect(postSpy).toHaveBeenCalledWith('/runs/run-abc/test-results', {
        runId: 'run-abc',
        title: 'should login',
        status: TestStatus.PASSED,
        duration: 1234,
      });
      expect(resultId).toBe('result-1');
    });

    it('propagates axios errors', async () => {
      postSpy.mockRejectedValueOnce(new Error('500'));
      await expect(
        client.createTestResult('run-abc', {
          runId: 'run-abc',
          title: 'test',
          status: TestStatus.FAILED,
          duration: 0,
        }),
      ).rejects.toThrow('500');
    });
  });

  describe('finalizeRun', () => {
    it('PATCHes /runs/:runId with status and duration', async () => {
      patchSpy.mockResolvedValueOnce({ data: {} });

      await client.finalizeRun('run-abc', {
        status: RunStatus.PASSED,
        duration: 5000,
      });

      expect(patchSpy).toHaveBeenCalledWith('/runs/run-abc', {
        status: RunStatus.PASSED,
        duration: 5000,
      });
    });

    it('propagates axios errors', async () => {
      patchSpy.mockRejectedValueOnce(new Error('404'));
      await expect(
        client.finalizeRun('run-abc', { status: RunStatus.FAILED, duration: 0 }),
      ).rejects.toThrow('404');
    });
  });

  describe('uploadArtifact', () => {
    it('POSTs multipart form data to /test-results/:resultId/artifacts', async () => {
      postSpy.mockResolvedValueOnce({ data: {} });

      const fakeBuffer = Buffer.from('fake-screenshot');

      await client.uploadArtifact('result-1', {
        filename: 'screenshot.png',
        contentType: 'image/png',
        data: fakeBuffer,
      });

      expect(postSpy).toHaveBeenCalledOnce();
      const [url, formData, config] = postSpy.mock.calls[0];
      expect(url).toBe('/test-results/result-1/artifacts');
      expect(formData).toBeInstanceOf(FormData);
      expect(config.headers).toMatchObject({
        'Content-Type': expect.stringContaining('multipart/form-data'),
      });
    });

    it('propagates axios errors', async () => {
      postSpy.mockRejectedValueOnce(new Error('413 Too Large'));
      await expect(
        client.uploadArtifact('result-1', {
          filename: 'trace.zip',
          contentType: 'application/zip',
          data: Buffer.from('x'),
        }),
      ).rejects.toThrow('413 Too Large');
    });
  });
});
