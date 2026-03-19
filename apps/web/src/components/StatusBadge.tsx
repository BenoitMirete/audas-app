import { Badge } from '@/components/ui/badge';

const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  passed: 'default',
  failed: 'destructive',
  running: 'secondary',
  pending: 'outline',
  skipped: 'outline',
  flaky: 'secondary',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={variantMap[status] ?? 'outline'}>{status}</Badge>;
}
