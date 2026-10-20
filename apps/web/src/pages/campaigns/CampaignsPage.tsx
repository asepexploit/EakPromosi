import { useQuery } from '@tanstack/react-query';

import { Badge } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { apiFetch } from '../../lib/api';
import type { CampaignSummary } from '@eak/shared';

export function CampaignsPage(): JSX.Element {
  const { data = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => apiFetch<CampaignSummary[]>('/campaigns'),
    refetchInterval: 15_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Campaign Management</h1>
        <p className="text-xs text-muted">
          Campaign merencanakan — eksekusi tetap lewat modul Broadcast (tidak duplikasi logika kirim).
        </p>
      </div>
      <Card>
        <CardHeader title={`Campaign (${data.length})`} />
        <CardBody>
          {data.length === 0 ? (
            <p className="text-sm text-muted">Belum ada campaign.</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.map((c) => (
                <li key={c.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted">{c.sent}/{c.totalPlanned} terkirim · {c.targetCount} target</p>
                  </div>
                  <Badge tone={c.status === 'running' ? 'ok' : c.status === 'failed' ? 'bad' : 'info'}>{c.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
