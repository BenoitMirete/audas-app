# @audas/reporter Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish `@audas/reporter`, a custom Playwright reporter npm package that ships test results, CI metadata, and artifacts to the Audas API after every test run.

**Architecture:** The reporter is a TypeScript class implementing Playwright's `Reporter` interface. It is composed of four focused units — an API client (axios), a CI metadata extractor (env var reader), a tag extractor, and a status mapper — which are wired together in the top-level reporter class. All network errors are caught and printed to stderr so the reporter can never cause a test suite to fail.

**Tech Stack:** TypeScript 5, Vitest, axios, form-data, @playwright/test (peer dep), @audas/shared (workspace dep)

---

## Prerequisites

- Plan 1 complete: monorepo root, pnpm workspaces, Turborepo, `@audas/shared` built and available as a workspace package.
- Plan 2 complete: Audas API deployed and accepting requests at a known `apiUrl`.
- Working directory for all commands: `/Users/ben/Developer/Audas`

---

## File Map

```
packages/reporter/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── vitest.config.ts
└── src/
    ├── index.ts                       # public entry point
    ├── reporter.ts                    # Reporter class (implements Reporter)
    ├── api-client.ts                  # axios wrapper for Audas API
    ├── ci-metadata.ts                 # GitLab CI env var extractor
    ├── tag-extractor.ts               # Playwright tag extractor
    ├── status-mapper.ts               # Playwright → TestStatus mapper
    └── __tests__/
        ├── api-client.test.ts
        ├── ci-metadata.test.ts
        ├── tag-extractor.test.ts
        ├── status-mapper.test.ts
        └── reporter.test.ts
```

---

## Task 1: Package scaffold

**Files:**

- Create: `packages/reporter/package.json`
- Create: `packages/reporter/tsconfig.json`
- Create: `packages/reporter/tsconfig.build.json`
- Create: `packages/reporter/vitest.config.ts`
- Create: `packages/reporter/src/index.ts`

- [ ] **Step 1: Create `packages/reporter/package.json`**

```json
{
  "name": "@audas/reporter",
  "version": "0.1.0",
  "description": "Playwright reporter for the Audas test dashboard",
  "keywords": ["playwright", "reporter", "testing"],
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "lint": "eslint src",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "axios": "^1.7.0",
    "form-data": "^4.0.0"
  },
  "peerDependencies": {
    "@playwright/test": ">=1.40.0"
  },
  "devDependencies": {
    "@audas/shared": "workspace:*",
    "@playwright/test": "^1.44.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.6.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create `packages/reporter/tsconfig.json`** (used by the IDE and tests — includes test files)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src"],
  "references": [{ "path": "../../packages/shared" }]
}
```

- [ ] **Step 3: Create `packages/reporter/tsconfig.build.json`** (used by `pnpm build` — excludes tests)

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["src/**/__tests__/**", "src/**/*.test.ts"]
}
```

- [ ] **Step 4: Create `packages/reporter/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**'],
    },
  },
});
```

- [ ] **Step 5: Create stub `packages/reporter/src/index.ts`** (will be filled out in Task 6)

```ts
// entry point — populated in Task 6
export {};
```

- [ ] **Step 6: Install dependencies**

Run from the monorepo root:

```bash
pnpm install
```

Expected: pnpm links `@audas/shared` as a workspace dependency and installs `axios`, `form-data`, `vitest`, `@playwright/test` into `packages/reporter/node_modules`.

- [ ] **Step 7: Verify Vitest runs (empty suite)**

```bash
cd packages/reporter && pnpm test
```

Expected: `No test files found` or `0 tests passed` — exits 0.

- [ ] **Step 8: Commit**

```bash
git add packages/reporter/
git commit -m "chore(reporter): scaffold @audas/reporter package"
```

---

## Task 2: Status mapper

The status mapper translates Playwright's `TestResult.status` string into our `TestStatus` enum. `timedOut` and `interrupted` both map to `failed`.

**Files:**

- Create: `packages/reporter/src/status-mapper.ts`
- Create: `packages/reporter/src/__tests__/status-mapper.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/reporter/src/__tests__/status-mapper.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mapStatus } from '../status-mapper.js';
import { TestStatus } from '@audas/shared';

describe('mapStatus', () => {
  it('maps passed → TestStatus.PASSED', () => {
    expect(mapStatus('passed')).toBe(TestStatus.PASSED);
  });

  it('maps failed → TestStatus.FAILED', () => {
    expect(mapStatus('failed')).toBe(TestStatus.FAILED);
  });

  it('maps skipped → TestStatus.SKIPPED', () => {
    expect(mapStatus('skipped')).toBe(TestStatus.SKIPPED);
  });

  it('maps timedOut → TestStatus.FAILED', () => {
    expect(mapStatus('timedOut')).toBe(TestStatus.FAILED);
  });

  it('maps interrupted → TestStatus.FAILED', () => {
    expect(mapStatus('interrupted')).toBe(TestStatus.FAILED);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/reporter && pnpm test
```

Expected: FAIL — `Cannot find module '../status-mapper.js'`

- [ ] **Step 3: Write minimal implementation**

Create `packages/reporter/src/status-mapper.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/reporter && pnpm test
```

Expected: PASS — `5 tests passed`

- [ ] **Step 5: Commit**

```bash
git add packages/reporter/src/status-mapper.ts packages/reporter/src/__tests__/status-mapper.test.ts
git commit -m "feat(reporter): add Playwright → TestStatus status mapper"
```

---

## Task 3: Tag extractor

Playwright 1.42+ supports native tags via `test.tag()` or `@tagname` syntax in the test title. Tags are available on `TestCase.tags` as a `string[]` where each entry is prefixed with `@` (e.g. `'@smoke'`). The extractor strips the `@` prefix.

**Files:**

- Create: `packages/reporter/src/tag-extractor.ts`
- Create: `packages/reporter/src/__tests__/tag-extractor.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/reporter/src/__tests__/tag-extractor.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { extractTags } from '../tag-extractor.js';

describe('extractTags', () => {
  it('returns empty array when tags is empty', () => {
    expect(extractTags([])).toEqual([]);
  });

  it('strips the @ prefix from tags', () => {
    expect(extractTags(['@smoke', '@auth'])).toEqual(['smoke', 'auth']);
  });

  it('handles tags without @ prefix gracefully', () => {
    // some older Playwright versions or manual test.tag() usage may omit @
    expect(extractTags(['smoke', '@regression'])).toEqual(['smoke', 'regression']);
  });

  it('deduplicates tags', () => {
    expect(extractTags(['@smoke', '@smoke', '@auth'])).toEqual(['smoke', 'auth']);
  });

  it('filters out empty strings after stripping', () => {
    expect(extractTags(['@', '@smoke'])).toEqual(['smoke']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/reporter && pnpm test
```

Expected: FAIL — `Cannot find module '../tag-extractor.js'`

- [ ] **Step 3: Write minimal implementation**

Create `packages/reporter/src/tag-extractor.ts`:

```ts
/**
 * Extracts clean tag names from a Playwright TestCase.tags array.
 * Playwright prefixes tags with '@' (e.g. '@smoke'). This function strips
 * that prefix, deduplicates, and filters out blanks.
 */
export function extractTags(tags: string[]): string[] {
  const cleaned = tags.map((tag) => (tag.startsWith('@') ? tag.slice(1) : tag));
  const deduped = [...new Set(cleaned)];
  return deduped.filter((tag) => tag.length > 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/reporter && pnpm test
```

Expected: PASS — `5 tests passed`

- [ ] **Step 5: Commit**

```bash
git add packages/reporter/src/tag-extractor.ts packages/reporter/src/__tests__/tag-extractor.test.ts
git commit -m "feat(reporter): add Playwright tag extractor"
```

---

## Task 4: CI metadata extractor

Reads GitLab CI environment variables and returns a `CIMetadata` object. If no CI variables are present (i.e. local development), returns `undefined`.

**Files:**

- Create: `packages/reporter/src/ci-metadata.ts`
- Create: `packages/reporter/src/__tests__/ci-metadata.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/reporter/src/__tests__/ci-metadata.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/reporter && pnpm test
```

Expected: FAIL — `Cannot find module '../ci-metadata.js'`

- [ ] **Step 3: Write minimal implementation**

Create `packages/reporter/src/ci-metadata.ts`:

```ts
import type { CIMetadata } from '@audas/shared';

/**
 * Reads GitLab CI environment variables and returns a CIMetadata object.
 * Returns undefined if no CI variables are present (local development).
 * Only includes fields whose corresponding env var is set to a non-empty value.
 */
export function extractCIMetadata(): CIMetadata | undefined {
  const env = process.env;

  const pick = (value: string | undefined): string | undefined =>
    value && value.length > 0 ? value : undefined;

  const metadata: CIMetadata = {
    branch: pick(env.CI_COMMIT_REF_NAME),
    commitSha: pick(env.CI_COMMIT_SHA),
    commitMessage: pick(env.CI_COMMIT_MESSAGE),
    pipelineId: pick(env.CI_PIPELINE_ID),
    pipelineUrl: pick(env.CI_PIPELINE_URL),
    mrId: pick(env.CI_MERGE_REQUEST_IID),
    mrUrl: pick(env.CI_MERGE_REQUEST_PROJECT_URL),
    triggeredBy: pick(env.GITLAB_USER_NAME),
  };

  // Remove undefined fields
  const defined = Object.fromEntries(
    Object.entries(metadata).filter(([, v]) => v !== undefined),
  ) as CIMetadata;

  // If no fields were set, this is not a CI environment
  if (Object.keys(defined).length === 0) {
    return undefined;
  }

  return defined;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/reporter && pnpm test
```

Expected: PASS — `5 tests passed`

- [ ] **Step 5: Commit**

```bash
git add packages/reporter/src/ci-metadata.ts packages/reporter/src/__tests__/ci-metadata.test.ts
git commit -m "feat(reporter): add GitLab CI metadata extractor"
```

---

## Task 5: API client

The API client is a typed wrapper around axios that handles the three API calls the reporter needs to make: `createRun`, `createTestResult`, and `finalizeRun`. It also handles artifact uploads as multipart form data. All methods return `Promise<T>` and let errors propagate — the reporter class is responsible for catching them.

**Files:**

- Create: `packages/reporter/src/api-client.ts`
- Create: `packages/reporter/src/__tests__/api-client.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/reporter/src/__tests__/api-client.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/reporter && pnpm test
```

Expected: FAIL — `Cannot find module '../api-client.js'`

- [ ] **Step 3: Write minimal implementation**

Create `packages/reporter/src/api-client.ts`:

```ts
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

    await this.http.post(`/test-results/${testResultId}/artifacts`, form, {
      headers: form.getHeaders(),
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/reporter && pnpm test
```

Expected: PASS — `10 tests passed`

- [ ] **Step 5: Commit**

```bash
git add packages/reporter/src/api-client.ts packages/reporter/src/__tests__/api-client.test.ts
git commit -m "feat(reporter): add typed Audas API client"
```

---

## Task 6: Reporter class

The reporter class implements Playwright's `Reporter` interface and wires together all previous units. It must:

1. Check `enabled` on construction and no-op silently if disabled.
2. `onBegin`: read CI metadata, call `createRun`, store the `runId`.
3. `onTestEnd`: map status, extract tags, call `createTestResult`, then upload each artifact in parallel.
4. `onEnd`: compute duration, determine final run status, call `finalizeRun`.
5. Wrap every API call in try/catch — log to stderr but never throw.

**Files:**

- Create: `packages/reporter/src/reporter.ts`
- Modify: `packages/reporter/src/index.ts`
- Create: `packages/reporter/src/__tests__/reporter.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/reporter/src/__tests__/reporter.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/reporter && pnpm test
```

Expected: FAIL — `Cannot find module '../reporter.js'`

- [ ] **Step 3: Write the reporter implementation**

Create `packages/reporter/src/reporter.ts`:

```ts
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
```

- [ ] **Step 4: Update `packages/reporter/src/index.ts`** to export the public surface

```ts
export { AudasReporter } from './reporter.js';
export type { AudasReporterOptions } from './reporter.js';
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd packages/reporter && pnpm test
```

Expected: PASS — all tests pass. Total count will be approximately 26+ tests across all test files.

- [ ] **Step 6: Run typecheck to confirm no TypeScript errors**

```bash
cd packages/reporter && pnpm typecheck
```

Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add packages/reporter/src/reporter.ts packages/reporter/src/index.ts packages/reporter/src/__tests__/reporter.test.ts
git commit -m "feat(reporter): implement AudasReporter class"
```

---

## Task 7: Build and integration verification

Verify the package compiles cleanly, can be packed for npm, and integrates into the Turborepo pipeline.

**Files:**

- Modify: `turbo.json` (add reporter to test/build pipeline if not already handled by the wildcard)

- [ ] **Step 1: Build the reporter package**

```bash
cd packages/reporter && pnpm build
```

Expected: `dist/` created with:

- `dist/index.js`
- `dist/index.d.ts`
- `dist/reporter.js` + `.d.ts`
- `dist/api-client.js` + `.d.ts`
- `dist/ci-metadata.js` + `.d.ts`
- `dist/tag-extractor.js` + `.d.ts`
- `dist/status-mapper.js` + `.d.ts`

- [ ] **Step 2: Run full test suite from root**

```bash
cd /Users/ben/Developer/Audas && pnpm test
```

Expected: Turborepo runs tests for both `@audas/shared` and `@audas/reporter`, all pass, exits 0.

- [ ] **Step 3: Run lint from root**

```bash
cd /Users/ben/Developer/Audas && pnpm lint
```

Expected: ESLint passes for both packages, exits 0.

- [ ] **Step 4: Verify `pnpm pack` output includes only `dist/`**

```bash
cd packages/reporter && pnpm pack --dry-run
```

Expected output includes:

```
dist/index.js
dist/index.d.ts
dist/reporter.js
dist/reporter.d.ts
dist/api-client.js
dist/api-client.d.ts
dist/ci-metadata.js
dist/ci-metadata.d.ts
dist/tag-extractor.js
dist/tag-extractor.d.ts
dist/status-mapper.js
dist/status-mapper.d.ts
package.json
README.md  (if present)
```

Verify that `src/`, `node_modules/`, and test files are NOT included.

- [ ] **Step 5: Verify the package is importable from another workspace package**

Create a temporary type-check file at `packages/reporter/src/__tests__/integration.typecheck.ts` (delete after verifying):

```ts
// This file verifies the public API of @audas/reporter is importable.
import { AudasReporter } from '../index.js';
import type { AudasReporterOptions } from '../index.js';

const opts: AudasReporterOptions = {
  apiUrl: 'https://audas.example.com',
  apiKey: 'test',
  projectId: 'proj-1',
};

const _reporter = new AudasReporter(opts);
const _disabled = new AudasReporter({ ...opts, enabled: false });

void [_reporter, _disabled];
```

Run:

```bash
cd packages/reporter && pnpm typecheck
```

Expected: exits 0. Then delete the file:

```bash
rm packages/reporter/src/__tests__/integration.typecheck.ts
```

- [ ] **Step 6: Commit**

```bash
git add packages/reporter/
git commit -m "chore(reporter): verify build and pack output"
```

---

## Task 8: Publish config (Changeset for initial release)

Add a Changeset entry to mark `@audas/reporter` at `0.1.0` and verify the release workflow.

**Files:**

- Create: `.changeset/<auto-named>.md` (generated by CLI)

- [ ] **Step 1: Create an initial changeset for the reporter**

```bash
cd /Users/ben/Developer/Audas && pnpm exec changeset add
```

When prompted:

- Select `@audas/reporter` (use spacebar to select, enter to confirm)
- Choose bump type: `minor` (0.1.0 → first feature release)
- Enter summary: `Initial release of @audas/reporter — custom Playwright reporter for the Audas dashboard`

Expected: a new file created at `.changeset/<some-hash>.md`.

- [ ] **Step 2: Verify changeset file was created**

```bash
ls .changeset/
```

Expected: two files — `config.json` and a new `<hash>.md`.

- [ ] **Step 3: Preview version bump**

```bash
pnpm exec changeset version --dry-run
```

Expected: prints that `@audas/reporter` will be bumped to `0.1.0`.

Note: `--dry-run` does not modify `package.json`. The actual version bump will happen in CI during release.

- [ ] **Step 4: Verify GitLab CI release stage is wired up**

Check that `.gitlab-ci.yml` (from Plan 1) has the `release` stage:

```bash
grep -A5 "^release:" .gitlab-ci.yml
```

Expected output:

```yaml
release:
  stage: release
  rules:
    - if: '$CI_COMMIT_TAG =~ /^v\d+\.\d+\.\d+$/'
  script:
    - echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc
    - pnpm exec changeset publish
```

If the CI file does not have this block, add it following the pattern from Plan 1, Task 7.

- [ ] **Step 5: Commit**

```bash
git add .changeset/
git commit -m "chore(reporter): add initial changeset for 0.1.0 release"
```

---

## Final verification

- [ ] **Full pipeline from root passes**

```bash
cd /Users/ben/Developer/Audas && pnpm lint && pnpm build && pnpm test
```

Expected: all three pass, exits 0. Turborepo will show cache hits for `@audas/shared` and fresh runs for `@audas/reporter`.

- [ ] **Workspace package graph is correct**

```bash
cd /Users/ben/Developer/Audas && pnpm list -r --depth 1
```

Expected: `@audas/reporter` lists `@audas/shared`, `axios`, and `form-data` as dependencies.

- [ ] **Reporter can be referenced in a hypothetical `playwright.config.ts`**

This is a documentation check only — no file to create. Confirm the usage example compiles mentally:

```ts
// playwright.config.ts (in a consumer project that has installed @audas/reporter)
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    [
      '@audas/reporter',
      {
        apiUrl: process.env.AUDAS_API_URL ?? 'https://audas.example.com',
        apiKey: process.env.AUDAS_API_KEY ?? '',
        projectId: 'my-project',
        enabled: process.env.AUDAS_ENABLED !== 'false',
      },
    ],
  ],
});
```

The reporter exports a default class from `dist/index.js`. Playwright loads the file and instantiates the default export with the options object — this matches our `AudasReporter` class export.

**Important:** For Playwright to auto-discover the reporter class as the default export, add a `default` export to `packages/reporter/src/index.ts`:

```ts
export { AudasReporter as default, AudasReporter } from './reporter.js';
export type { AudasReporterOptions } from './reporter.js';
```

Rebuild after this change:

```bash
cd packages/reporter && pnpm build
```

- [ ] **Commit the default export fix**

```bash
git add packages/reporter/src/index.ts
git commit -m "fix(reporter): add default export for Playwright reporter auto-discovery"
```

---

## What's next

- **Plan 4:** `apps/web` — React + Vite frontend (dashboard, run list, test detail, flaky tests page)
- **Post-Plan 3 wiring:** When Plan 2 (API) is complete, run an end-to-end smoke test: point a real Playwright project at the local API with `@audas/reporter` configured and verify a run appears in the database.
