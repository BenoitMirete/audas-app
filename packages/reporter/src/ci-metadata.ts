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
