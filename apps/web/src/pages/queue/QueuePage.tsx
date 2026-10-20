import { useQuery } from '@tanstack/react-query';
import { ListTodo } from 'lucide-react';

import { Badge } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { apiFetch } from '../../lib/api';
import type { AuditLog } from '@eak/shared';

export function QueuePage(): JSX.Element {
  const { data = [], isLoading } = useQuery({
    queryKey: ['audit', 'recent'],
    queryFn: () => apiFetch<AuditLog[]>('/audit', { query: { limit: 50 } }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task Queue & Activity Logs"
        description="Riwayat tindakan sensitif tenant. Lihat Live Monitoring untuk status queue real-time."
      />

      <Card>
        <CardHeader title={`Aktivitas terbaru (${data.length})`} icon={<ListTodo size={14} />} />
        <CardBody className="pt-0">
          {isLoading ? (
            <div className="skeleton h-[300px]" />
          ) : data.length === 0 ? (
            <EmptyState icon={<ListTodo size={24} />} title="Belum ada aktivitas" description="Audit log muncul saat ada mutasi sensitif." />
          ) : (
            <ul className="divide-y divide-line-soft">
              {data.map((a) => (
                <li key={a.id} className="py-3">
                  <div className="flex justify-between gap-4 items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-tg-ink bg-tg/10 px-2 py-0.5 rounded">{a.action}</span>
                        <Badge
                          tone={a.severity === 'critical' ? 'bad' : a.severity === 'warn' ? 'warn' : 'default'}
                          dot={false}
                        >
                          {a.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted mt-1.5">
                        {a.actorEmail ?? 'system'} → {a.resource}
                        {a.resourceId ? ` #${a.resourceId}` : ''}
                      </p>
                    </div>
                    <span className="text-xs text-muted tabular whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleString('id-ID')}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
