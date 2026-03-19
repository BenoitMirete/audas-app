import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { OccurrenceDots } from '@/components/OccurrenceDots';
import { api } from '@/lib/api';

export const Route = createFileRoute('/projects/$projectId/flaky')({ component: FlakyPage });

export function FlakyTestsTable({ projectId }: { projectId: string }) {
  const { data: flaky = [], isLoading } = useQuery({
    queryKey: ['flaky', projectId],
    queryFn: () => api.flaky.list(projectId).then((r) => r.data),
  });

  if (isLoading) return <p>Loading…</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Test</TableHead>
          <TableHead>Flaky Rate</TableHead>
          <TableHead>Last 10 Runs</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {flaky.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground">
              No flaky tests detected
            </TableCell>
          </TableRow>
        ) : (
          flaky.map((test) => (
            <TableRow key={test.title}>
              <TableCell>{test.title}</TableCell>
              <TableCell>{Math.round(test.rate * 100)}%</TableCell>
              <TableCell>
                <OccurrenceDots occurrences={test.occurrences} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function FlakyPage() {
  const { projectId } = Route.useParams();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Flaky Tests</h1>
      <FlakyTestsTable projectId={projectId} />
    </div>
  );
}
