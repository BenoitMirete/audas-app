import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export const Route = createFileRoute('/projects/$projectId/settings')({ component: SettingsPage });

export function ProjectSettings({ projectId }: { projectId: string }) {
  const qc = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.projects.get(projectId).then((r) => r.data),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members', projectId],
    queryFn: () => api.members.list(projectId).then((r) => r.data),
  });

  const [name, setName] = useState('');
  const [slackWebhook, setSlackWebhook] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setSlackWebhook(project.slackWebhook ?? '');
    }
  }, [project]);

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; slackWebhook?: string }) =>
      api.projects.update(projectId, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', projectId] }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => api.members.remove(projectId, memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', projectId] }),
  });

  return (
    <Tabs defaultValue="config">
      <TabsList>
        <TabsTrigger value="config">Config</TabsTrigger>
        <TabsTrigger value="members">Members</TabsTrigger>
        <TabsTrigger value="slack">Slack</TabsTrigger>
      </TabsList>

      <TabsContent value="config" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Project Config</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button onClick={() => updateMutation.mutate({ name })}>Save</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="members" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{member.role}</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeMemberMutation.mutate(member.id)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="slack" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Slack Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="slack-webhook">Webhook URL</Label>
              <Input
                id="slack-webhook"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/..."
              />
            </div>
            <Button onClick={() => updateMutation.mutate({ slackWebhook })}>Save</Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function SettingsPage() {
  const { projectId } = Route.useParams();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Project Settings</h1>
      <ProjectSettings projectId={projectId} />
    </div>
  );
}
