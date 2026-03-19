import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/projects/$projectId/flaky')({ component: () => <div>Flaky (stub)</div> });
