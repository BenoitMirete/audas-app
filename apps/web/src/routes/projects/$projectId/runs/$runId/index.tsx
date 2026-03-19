import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/projects/$projectId/runs/$runId/')({ component: () => <div>Run (stub)</div> });
