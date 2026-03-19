import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { OccurrenceDots } from '@/components/OccurrenceDots';
import { ArtifactViewer } from '@/components/ArtifactViewer';
import { api } from '@/lib/api';

export const Route = createFileRoute('/projects/$projectId/runs/$runId/tests/$testId')({
  component: TestPage,
});

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function TestDetail({
  projectId,
  runId,
  testId,
}: {
  projectId: string;
  runId: string;
  testId: string;
}) {
  const { data: test } = useQuery({
    queryKey: ['test', projectId, runId, testId],
    queryFn: () => api.testResults.get(projectId, runId, testId).then((r) => r.data),
  });

  const { data: history = [] } = useQuery({
    queryKey: ['test-history', projectId, testId],
    queryFn: () => api.testResults.history(projectId, testId).then((r) => r.data),
    enabled: !!test,
  });

  if (!test) return <p>Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">{test.title}</h1>
        <StatusBadge status={test.status} />
        <span className="text-sm text-muted-foreground">{(test.duration / 1000).toFixed(1)}s</span>
      </div>

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Occurrence History</CardTitle>
          </CardHeader>
          <CardContent>
            <OccurrenceDots occurrences={history} />
          </CardContent>
        </Card>
      )}

      {(test.errorMessage || test.stackTrace) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {test.errorMessage && <p className="text-sm text-destructive">{test.errorMessage}</p>}
            {test.stackTrace && (
              <pre className="text-xs bg-muted p-3 rounded overflow-auto">{test.stackTrace}</pre>
            )}
          </CardContent>
        </Card>
      )}

      <ArtifactViewer
        screenshots={test.screenshots}
        videos={test.videos}
        traces={test.traces}
        apiBase={API_BASE}
      />
    </div>
  );
}

function TestPage() {
  const { projectId, runId, testId } = Route.useParams();
  return <TestDetail projectId={projectId} runId={runId} testId={testId} />;
}
