import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/api';
import type { Run } from '@/lib/api';

export const Route = createFileRoute('/projects/$projectId/runs/$runId/')({ component: RunPage });

const ACTIVE_STATUSES = new Set<Run['status']>(['pending', 'running']);

export function RunDetail({ projectId, runId }: { projectId: string; runId: string }) {
  const { data: run } = useQuery({
    queryKey: ['run', projectId, runId],
    queryFn: () => api.runs.get(projectId, runId).then((r) => r.data),
    refetchInterval: (query) =>
      ACTIVE_STATUSES.has(query.state.data?.status as Run['status']) ? 5000 : false,
  });

  const { data: tests = [] } = useQuery({
    queryKey: ['tests', projectId, runId],
    queryFn: () => api.testResults.list(projectId, runId).then((r) => r.data),
    enabled: !!run,
    refetchInterval: (query) =>
      run && ACTIVE_STATUSES.has(run.status) ? 5000 : false,
  });

  if (!run) return <p>Loading…</p>;

  const hasCIMetadata = !!(
    run.branch || run.commitSha || run.commitMessage || run.pipelineId ||
    run.pipelineUrl || run.mrId || run.mrUrl || run.triggeredBy
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold font-mono">{runId.slice(0, 8)}</h1>
        <StatusBadge status={run.status} />
      </div>

      {hasCIMetadata && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CI Metadata</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            {run.branch && <><dt className="font-medium">Branch</dt><dd>{run.branch}</dd></>}
            {run.commitSha && (
              <><dt className="font-medium">Commit</dt><dd className="font-mono">{run.commitSha.slice(0, 8)}</dd></>
            )}
            {run.commitMessage && (
              <><dt className="font-medium">Message</dt><dd>{run.commitMessage}</dd></>
            )}
            {run.pipelineId && run.pipelineUrl && (
              <><dt className="font-medium">Pipeline</dt><dd><a href={run.pipelineUrl} className="underline">#{run.pipelineId}</a></dd></>
            )}
            {run.pipelineId && !run.pipelineUrl && (
              <><dt className="font-medium">Pipeline</dt><dd>#{run.pipelineId}</dd></>
            )}
            {run.triggeredBy && (
              <><dt className="font-medium">Triggered by</dt><dd>{run.triggeredBy}</dd></>
            )}
          </CardContent>
        </Card>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Test</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tests.map((test) => (
            <TableRow key={test.id}>
              <TableCell>
                <Link
                  to="/projects/$projectId/runs/$runId/tests/$testId"
                  params={{ projectId, runId, testId: test.id }}
                  className="underline"
                >
                  {test.title}
                </Link>
              </TableCell>
              <TableCell><StatusBadge status={test.status} /></TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {test.tags.join(', ') || '—'}
              </TableCell>
              <TableCell className="text-sm">
                {(test.duration / 1000).toFixed(1)}s
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RunPage() {
  const { projectId, runId } = Route.useParams();
  return <RunDetail projectId={projectId} runId={runId} />;
}
