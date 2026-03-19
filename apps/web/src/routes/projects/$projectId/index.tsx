import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/api';
import type { RunStatus } from '@audas/shared';

export const Route = createFileRoute('/projects/$projectId/')({ component: ProjectPage });

export function ProjectRunsTable({ projectId }: { projectId: string }) {
  const [branch, setBranch] = useState('');
  const [status, setStatus] = useState('');

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['runs', projectId, { branch, status }],
    queryFn: () =>
      api.runs
        .list(projectId, {
          ...(branch && { branch }),
          ...(status && { status: status as RunStatus }),
        })
        .then((r) => r.data),
  });

  const branches = [...new Set(runs.map((r) => r.branch).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="branch-filter">Branch</Label>
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger id="branch-filter" className="w-48" aria-label="Branch">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b} value={b!}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="status-filter">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="status-filter" className="w-36" aria-label="Status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              {['passed', 'failed', 'running', 'pending'].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Run ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => (
              <TableRow key={run.id}>
                <TableCell>
                  <Link
                    to="/projects/$projectId/runs/$runId"
                    params={{ projectId, runId: run.id }}
                    className="font-mono text-sm underline"
                  >
                    {run.id.slice(0, 8)}
                  </Link>
                </TableCell>
                <TableCell>
                  <StatusBadge status={run.status} />
                </TableCell>
                <TableCell className="font-mono text-sm">{run.branch ?? '—'}</TableCell>
                <TableCell className="text-sm">
                  {new Date(run.startedAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-sm">
                  {run.duration ? `${(run.duration / 1000).toFixed(1)}s` : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function ProjectPage() {
  const { projectId } = Route.useParams();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Project Runs</h1>
        <nav className="flex gap-3 text-sm">
          <Link to="/projects/$projectId/flaky" params={{ projectId }} className="underline">
            Flaky Tests
          </Link>
          <Link to="/projects/$projectId/settings" params={{ projectId }} className="underline">
            Settings
          </Link>
        </nav>
      </div>
      <ProjectRunsTable projectId={projectId} />
    </div>
  );
}
