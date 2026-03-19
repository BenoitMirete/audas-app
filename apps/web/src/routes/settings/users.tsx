import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export const Route = createFileRoute('/settings/users')({ component: UsersPage });

export function UsersTable() {
  const qc = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.users.list().then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.users.update(id, { role: role as 'admin' | 'viewer' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.users.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <select
                value={user.role}
                onChange={(e) => updateMutation.mutate({ id: user.id, role: e.target.value })}
                className="text-sm"
              >
                <option value="viewer">viewer</option>
                <option value="admin">admin</option>
              </select>
            </TableCell>
            <TableCell>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate(user.id)}
              >
                Delete
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function UsersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
      <UsersTable />
    </div>
  );
}
