import { useQuery } from '@tanstack/react-query';

import { Badge } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { apiFetch } from '../../lib/api';
import type { MonitoringSnapshot } from '@eak/shared';

export function MonitoringPage(): JSX.Element {
  const { data } = useQuery({
    queryKey: ['monitoring', 'snapshot'],
    queryFn: () => apiFetch<MonitoringSnapshot>('/monitoring/snapshot'),
    refetchInterval: 5_000,
  });

  if (!data) return <div className="text-muted text-sm">Memuat snapshot…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Live Monitoring</h1>
        <p className="text-xs text-muted">Status layanan + status queue (diperbarui tiap 5 detik).</p>
      </div>
      <Card>
        <CardHeader title="Services" />
        <CardBody className="grid grid-cols-5 gap-3 text-sm">
          {(['api', 'worker', 'postgres', 'redis', 'telegram'] as const).map((k) => (
            <div key={k}>
              <p className="text-xs text-muted uppercase">{k}</p>
              <Badge tone={data.services[k] === 'ok' ? 'ok' : data.services[k] === 'degraded' ? 'warn' : 'bad'}>
                {data.services[k]}
              </Badge>
            </div>
          ))}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Queue stats" />
        <CardBody>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted border-b border-line">
              <tr>
                <th className="text-left py-2">Queue</th>
                <th className="text-right">Waiting</th>
                <th className="text-right">Active</th>
                <th className="text-right">Delayed</th>
                <th className="text-right">Failed</th>
              </tr>
            </thead>
            <tbody>
              {data.queues.map((q) => (
                <tr key={q.name} className="border-b border-line/60">
                  <td className="py-2 font-mono text-xs">{q.name}</td>
                  <td className="text-right tabular">{q.waiting}</td>
                  <td className="text-right tabular text-ok">{q.active}</td>
                  <td className="text-right tabular">{q.delayed}</td>
                  <td className="text-right tabular text-bad">{q.failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
