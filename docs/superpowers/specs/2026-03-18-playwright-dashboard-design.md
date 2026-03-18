# Audas — Playwright Dashboard Design Spec

**Date:** 2026-03-18
**Status:** Approved

---

## Overview

Audas is a centralized dashboard for managing Playwright test executions and debugging across multiple projects, running both locally and in GitLab CI. It provides test result history, debugging tools (traces, screenshots, videos), flaky test detection, run comparison, tag-based filtering, and Slack notifications on failure.

**Tech stack:** TypeScript throughout — NestJS + Prisma (API), React + Vite (web), custom Playwright reporter (npm package).

---

## Architecture

Monorepo managed with **pnpm workspaces + Turborepo**.

```
audas/
├── apps/
│   ├── api/                  # NestJS + Prisma + PostgreSQL
│   └── web/                  # React + Vite
├── packages/
│   ├── reporter/             # @audas/reporter — Playwright reporter, published to npm
│   └── shared/               # @audas/shared — shared TypeScript types (no logic)
├── package.json              # pnpm workspaces config
├── turbo.json                # Build/test/lint pipeline
└── .gitlab-ci.yml            # Monorepo CI pipeline
```

**Package scope:** `@audas/*`

**Tooling:**
- `pnpm` — workspaces, fast installs
- `Turborepo` — task orchestration with caching
- `Changesets` — versioning and npm release of `@audas/reporter`
- `ESLint + Prettier` — shared config at root

---

## API (`apps/api`)

NestJS application with PostgreSQL via Prisma.

### Modules

| Module | Responsibility |
|---|---|
| `AuthModule` | JWT + refresh tokens, role-based access (admin / viewer) |
| `UsersModule` | User CRUD, role assignment |
| `ProjectsModule` | Project CRUD (one project = one Playwright repo/scope) |
| `RunsModule` | Receive and store test runs from reporters |
| `TestResultsModule` | Individual test results, artifact access |
| `TagsModule` | Tag listing, stats per tag |
| `NotificationsModule` | Slack webhook notifications on run failure |

### Data Model

```
Project
  ├── members: ProjectMembership[] → User
  └── runs: Run[]
        └── testResults: TestResult[]
              └── tags: TestResultTag[] → Tag

Tag (scoped per Project)
User
```

**Run** — one full execution (e.g. one GitLab CI job or one local run):
- `id`, `projectId`, `status` (pending | running | passed | failed)
- `startedAt`, `finishedAt`, `duration`
- CI metadata (nullable — absent for local runs):
  - `branch` (`CI_COMMIT_REF_NAME`)
  - `commitSha` (`CI_COMMIT_SHA`)
  - `commitMessage` (`CI_COMMIT_MESSAGE`)
  - `pipelineId` (`CI_PIPELINE_ID`)
  - `pipelineUrl` (`CI_PIPELINE_URL`)
  - `mrId`, `mrUrl` (`CI_MERGE_REQUEST_IID`, `CI_MERGE_REQUEST_PROJECT_URL`)
  - `triggeredBy` (`GITLAB_USER_NAME`)

**TestResult** — one individual Playwright test:
- `id`, `runId`, `title`, `status` (passed | failed | skipped | flaky)
- `duration`, `errorMessage`, `stackTrace`
- `tags: Tag[]` (many-to-many)
- Artifact references (filesystem paths): screenshots, videos, traces

**Artifact storage:** uploaded files stored on filesystem (local path or S3-compatible). Not stored in the database — only paths/references.

**Flaky test detection:** computed on-demand by comparing the last N runs of the same test (no complex real-time logic).

---

## Frontend (`apps/web`)

React + Vite SPA.

### Pages

| Page | Content |
|---|---|
| `Dashboard` | Global overview — latest runs per project, success rates, recent flaky tests |
| `Project` | Run history, filterable by branch / tag / status |
| `Run` | Run detail — test list, duration, branch/commit metadata |
| `Test` | Test detail — status, logs, screenshots, traces, video, occurrence history |
| `Flaky Tests` | Detected flaky tests, trend over last N runs |
| `Settings > Project` | Project config, members, Slack webhook |
| `Settings > Users` | User account management (admin only) |

### Stack

- **TanStack Router** — type-safe routing
- **TanStack Query** — data fetching and caching, `refetchInterval` for active run polling
- **shadcn/ui + Tailwind** — UI components

**No real-time in v1** — simple polling via TanStack Query. WebSockets deferred to a future iteration.

---

## Reporter (`packages/reporter`)

Published as `@audas/reporter` on npm. Implements the Playwright `Reporter` interface.

### Configuration

```ts
// playwright.config.ts
export default defineConfig({
  reporter: [
    ['@audas/reporter', {
      apiUrl: 'https://audas.example.com',
      apiKey: 'xxx',
      projectId: 'my-project',
      enabled: process.env.AUDAS_ENABLED !== 'false', // opt-out locally
    }]
  ]
})
```

### Lifecycle

1. `onBegin` → POST to API to create a `Run`
2. `onTestEnd` → POST each `TestResult` + upload artifacts (multipart)
3. `onEnd` → PATCH the `Run` with final status and duration

### Data collected per test

- Status (passed / failed / skipped / flaky), duration, error message, stack trace
- Tags — extracted automatically from Playwright annotations
- Artifacts — screenshots, videos, traces
- CI metadata — injected from GitLab CI environment variables if present

**Resilience:** errors during reporting are logged but never cause test suite failure. The reporter is a passive observer.

---

## Shared Types (`packages/shared`)

Pure TypeScript types and enums — no logic, no external dependencies. Consumed by both `api` and `reporter`.

```ts
CreateRunDto          // reporter → API: create a run
CreateTestResultDto   // reporter → API: create a test result
RunStatus             // enum: pending | running | passed | failed
TestStatus            // enum: passed | failed | skipped | flaky
CIMetadata            // branch, commitSha, pipelineId, mrId, triggeredBy, etc.
TagDto                // tag name
```

---

## GitLab CI (`.gitlab-ci.yml`)

Single pipeline at monorepo root. Turborepo handles caching between jobs.

```yaml
stages: [lint, build, test, release]

lint:    turbo run lint
build:   turbo run build
test:    turbo run test

# npm release on git tag (Changesets)
release: changeset publish
```

The `@audas/reporter` package is published to npm automatically when a git tag is pushed.

---

## Out of Scope (v1)

- Triggering test runs from the dashboard UI
- Real-time run updates via WebSockets
- Non-Slack notification channels (email, etc.)
- S3 artifact storage (local filesystem only in v1)
