# Audas — Plan 1: Monorepo Foundation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the pnpm + Turborepo monorepo with shared TypeScript config, ESLint/Prettier, the `@audas/shared` types package, Changesets, and a GitLab CI skeleton — everything other plans build on.

**Architecture:** pnpm workspaces manages `apps/*` and `packages/*`. Turborepo orchestrates build/lint/test tasks with caching across the workspace. `@audas/shared` is the single source of truth for types shared between the API and the reporter; it has no runtime dependencies.

**Tech Stack:** pnpm 9, Turborepo 2, TypeScript 5, ESLint 9 (flat config), Prettier 3, @changesets/cli

---

## File Map

```
audas/
├── .changeset/
│   └── config.json
├── packages/
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── __tests__/
│           │   └── types.test.ts
│           ├── index.ts
│           ├── enums.ts
│           └── dtos.ts
├── .gitignore
├── .nvmrc
├── .prettierrc
├── .prettierignore
├── eslint.config.js
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── turbo.json
└── .gitlab-ci.yml
```

---

## Task 1: pnpm workspace root

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`
- Create: `.nvmrc`

- [ ] **Step 1: Verify pnpm is available**

```bash
pnpm --version
```

Expected: `9.x.x`. If not installed: `npm install -g pnpm@9`

- [ ] **Step 2: Create root `package.json`**

```json
{
  "name": "audas",
  "private": true,
  "version": "0.0.0",
  "packageManager": "pnpm@9.0.0",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\" --ignore-path .prettierignore",
    "format:check": "prettier --check \"**/*.{ts,tsx,json,md}\" --ignore-path .prettierignore"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    "turbo": "^2.0.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 3: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 4: Create `.nvmrc`**

```
20
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules/
dist/
.turbo/
*.tsbuildinfo
.env
.env.local
coverage/
```

- [ ] **Step 6: Create placeholder dirs so pnpm is happy**

```bash
mkdir -p apps packages
```

- [ ] **Step 7: Install root deps**

```bash
pnpm install
```

Expected: `node_modules/` created at root, lockfile `pnpm-lock.yaml` generated.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml .gitignore .nvmrc
git commit -m "chore: init pnpm workspace"
```

---

## Task 2: TypeScript base config

**Files:**
- Create: `tsconfig.base.json`

- [ ] **Step 1: Create `tsconfig.base.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 2: Verify TypeScript is available**

```bash
pnpm exec tsc --version
```

Expected: `Version 5.x.x`

- [ ] **Step 3: Commit**

```bash
git add tsconfig.base.json
git commit -m "chore: add shared TypeScript base config"
```

---

## Task 3: ESLint + Prettier

**Files:**
- Create: `eslint.config.js`
- Create: `.prettierrc`
- Create: `.prettierignore`

- [ ] **Step 1: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 2: Create `.prettierignore`**

```
node_modules/
dist/
.turbo/
pnpm-lock.yaml
```

- [ ] **Step 3: Create `eslint.config.js`** (ESLint v9 flat config)

```js
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.js'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs['recommended'].rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
```

Note: `eslint.config.js` uses ESM — add `"type": "module"` to root `package.json`.

- [ ] **Step 4: Add `"type": "module"` to root `package.json`**

Add `"type": "module"` to the root `package.json` (alongside `"private": true`).

- [ ] **Step 5: Run format check to verify Prettier works**

```bash
pnpm format:check
```

Expected: exits 0 (or shows which files would change — fix with `pnpm format`).

- [ ] **Step 6: Run lint to verify ESLint config loads**

```bash
pnpm exec eslint . --max-warnings 0
```

Expected: exits 0 (no files to lint yet, no errors).

- [ ] **Step 7: Commit**

```bash
git add eslint.config.js .prettierrc .prettierignore package.json
git commit -m "chore: add ESLint and Prettier config"
```

---

## Task 4: `@audas/shared` package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/enums.ts`
- Create: `packages/shared/src/dtos.ts`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Write the failing type test first**

Create `packages/shared/src/index.ts` with just an empty export so TypeScript can parse it:

```ts
// intentionally empty — types not implemented yet
export {};
```

Create `packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "exclude": ["src/**/__tests__/**", "src/**/*.test.ts"]
}
```

Create `packages/shared/package.json`:

```json
{
  "name": "@audas/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "lint": "eslint src",
    "test": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Write a consumer test that imports types that don't exist yet**

Create `packages/shared/src/__tests__/types.test.ts`:

```ts
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
```

- [ ] **Step 3: Run type check to see it fail**

```bash
cd packages/shared && pnpm test
```

Expected: TypeScript errors — `RunStatus`, `TestStatus`, etc. not found.

- [ ] **Step 4: Implement `src/enums.ts`**

```ts
export enum RunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PASSED = 'passed',
  FAILED = 'failed',
}

export enum TestStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  FLAKY = 'flaky',
}
```

- [ ] **Step 5: Implement `src/dtos.ts`**

```ts
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
```

- [ ] **Step 6: Implement `src/index.ts`**

```ts
export { RunStatus, TestStatus } from './enums.js';
export type { CIMetadata, TagDto, CreateRunDto, CreateTestResultDto } from './dtos.js';
```

- [ ] **Step 7: Run type check — must pass**

```bash
cd packages/shared && pnpm test
```

Expected: exits 0 with no errors.

- [ ] **Step 8: Build the package**

```bash
cd packages/shared && pnpm build
```

Expected: `dist/` directory created with `.js` and `.d.ts` files.

- [ ] **Step 9: Commit**

```bash
git add packages/shared/
git commit -m "feat(shared): add @audas/shared types package"
```

---

## Task 5: Turborepo

**Files:**
- Create: `turbo.json`
- Modify: `package.json` (scripts already reference `turbo`)

- [ ] **Step 1: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

- [ ] **Step 2: Run `turbo build` from root**

```bash
pnpm build
```

Expected: Turborepo runs `build` on `@audas/shared`, exits 0, shows cache info.

- [ ] **Step 3: Run `turbo lint` from root**

```bash
pnpm lint
```

Expected: ESLint runs across all packages, exits 0.

- [ ] **Step 4: Run `turbo test` from root**

```bash
pnpm test
```

Expected: `tsc --noEmit` passes for `@audas/shared`, exits 0.

- [ ] **Step 5: Commit**

```bash
git add turbo.json
git commit -m "chore: add Turborepo orchestration"
```

---

## Task 6: Changesets

**Files:**
- Create: `.changeset/config.json` (generated by CLI)

- [ ] **Step 1: Install @changesets/cli**

```bash
pnpm add -D @changesets/cli -w
```

(`-w` installs at workspace root)

- [ ] **Step 2: Initialize changesets**

```bash
pnpm exec changeset init
```

Expected: `.changeset/` directory created with `config.json` and `README.md`.

- [ ] **Step 3: Update `.changeset/config.json`**

Replace the generated config with:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["audas", "@audas/shared"]
}
```

Note: only `@audas/reporter` will be published to npm. `@audas/shared` is a private internal package (`ignore` list). `audas` (root) is `private: true`.

- [ ] **Step 4: Commit**

```bash
git add .changeset/ pnpm-lock.yaml package.json
git commit -m "chore: init changesets for reporter releases"
```

---

## Task 7: GitLab CI skeleton

**Files:**
- Create: `.gitlab-ci.yml`

- [ ] **Step 1: Create `.gitlab-ci.yml`**

```yaml
image: node:20-alpine

stages:
  - lint
  - build
  - test
  - release

variables:
  PNPM_VERSION: "9"

before_script:
  - corepack enable
  - corepack prepare pnpm@${PNPM_VERSION} --activate
  - pnpm install --frozen-lockfile

cache:
  key:
    files:
      - pnpm-lock.yaml
  paths:
    - node_modules/
    - .turbo/

lint:
  stage: lint
  script:
    - pnpm lint
    - pnpm format:check

build:
  stage: build
  script:
    - pnpm build
  artifacts:
    paths:
      - packages/*/dist/
      - apps/*/dist/
    expire_in: 1 hour

test:
  stage: test
  script:
    - pnpm test

release:
  stage: release
  rules:
    - if: '$CI_COMMIT_TAG =~ /^v\d+\.\d+\.\d+$/'
  script:
    - echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc
    - pnpm exec changeset publish
```

- [ ] **Step 2: Validate YAML syntax**

```bash
pnpm exec js-yaml .gitlab-ci.yml > /dev/null && echo "YAML valid"
```

If `js-yaml` is not available, just visually inspect for indentation errors.

- [ ] **Step 3: Commit**

```bash
git add .gitlab-ci.yml
git commit -m "ci: add GitLab CI pipeline skeleton"
```

---

## Final verification

- [ ] **Run full pipeline from root**

```bash
pnpm lint && pnpm build && pnpm test
```

Expected: all three pass, exits 0.

- [ ] **Verify workspace links are correct**

```bash
pnpm list -r --depth 0
```

Expected: lists `audas` (root) and `@audas/shared` as workspace packages.

- [ ] **Tag initial version**

```bash
git tag v0.0.1 -m "chore: initial monorepo foundation"
```

---

## What's next

- **Plan 2:** `apps/api` — NestJS + Prisma backend (Auth, Users, Projects, Runs, TestResults, Tags, Notifications)
- **Plan 3:** `packages/reporter` — `@audas/reporter` Playwright reporter (npm package)
- **Plan 4:** `apps/web` — React + Vite frontend
