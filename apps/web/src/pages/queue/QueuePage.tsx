import { useQuery } from '@tanstack/react-query';

import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { apiFetch } from '../../lib/api';
import type { AuditLog } from '@eak/shared';

export function QueuePage(): JSX.Element {
  const { data = [] } = useQuery({
    queryKey: ['audit', 'recent'],
    queryFn: () => apiFetch<AuditLog[]>('/audit', { query: { limit: 50 } }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Task Queue & Activity Logs</h1>
        <p className="text-xs text-muted">Riwayat tindakan sensitif tenant. Lihat Live Monitoring untuk status queue real-time.</p>
      </div>
      <Card>
        <CardHeader title="Aktivitas terbaru" />
        <CardBody>
          <ul className="divide-y divide-line text-sm">
            {data.map((a) => (
              <li key={a.id} className="py-3">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-medium">{a.action}</p>
                    <p className="text-xs text-muted">
                      {a.actorEmail ?? 'system'} → {a.resource}{a.resourceId ? ` #${a.resourceId}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-muted">{new Date(a.createdAt).toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
          {data.length === 0 && <p className="text-sm text-muted">Belum ada aktivitas.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
