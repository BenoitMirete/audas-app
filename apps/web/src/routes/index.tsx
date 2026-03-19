import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/api';

export const Route = createFileRoute('/')({ component: DashboardPage });

export function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.dashboard.get().then((r) => r.data),
  });

  if (isLoading || !data) return <p>Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.totalRuns}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Pass Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{Math.round(data.passRate * 100)}%</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Projects</h2>
        <div className="grid gap-3">
          {data.projects.map(({ project, latestRun }) => (
            <Card key={project.id}>
              <CardContent className="pt-4 flex items-center justify-between">
                <Link
                  to="/projects/$projectId"
                  params={{ projectId: project.id }}
                  className="font-medium underline"
                >
                  {project.name}
                </Link>
                {latestRun && <StatusBadge status={latestRun.status} />}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {data.recentFlakyTests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Flaky Tests</h2>
          <ul className="space-y-1">
            {data.recentFlakyTests.map((t) => (
              <li key={t.title} className="text-sm text-muted-foreground">
                <span>{t.title}</span>
                {' — '}
                {Math.round(t.rate * 100)}% flaky
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DashboardPage() {
  return <Dashboard />;
}
