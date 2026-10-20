import { useQuery } from '@tanstack/react-query';

import { Badge } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { apiFetch } from '../../lib/api';
import type { BroadcastSummary } from '@eak/shared';

export function BroadcastsPage(): JSX.Element {
  const { data = [] } = useQuery({
    queryKey: ['broadcasts'],
    queryFn: () => apiFetch<BroadcastSummary[]>('/broadcasts'),
    refetchInterval: 10_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Auto Broadcast</h1>
        <p className="text-xs text-muted">
          Target harus memiliki <code>allow_promotion = true</code> dan tidak di-exclude. Rate limit 20–60s jitter antar pesan per akun.
        </p>
      </div>
      <Card>
        <CardHeader title={`Broadcast terbaru (${data.length})`} />
        <CardBody>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted border-b border-line">
              <tr>
                <th className="text-left py-2">Judul</th>
                <th className="text-left">Status</th>
                <th className="text-right">Terkirim</th>
                <th className="text-right">Gagal</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((b) => (
                <tr key={b.id} className="border-b border-line/60">
                  <td className="py-2">{b.title}</td>
                  <td><Badge tone={b.status === 'completed' ? 'ok' : b.status === 'failed' ? 'bad' : 'info'}>{b.status}</Badge></td>
                  <td className="text-right tabular text-ok">{b.sentCount}</td>
                  <td className="text-right tabular text-bad">{b.failedCount}</td>
                  <td className="text-right tabular">{b.totalTargets}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && <p className="text-sm text-muted">Belum ada broadcast.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
