import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/projects/$projectId/runs/$runId/tests/$testId')({ component: () => <div>Test (stub)</div> });
