import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, Database, Radio, Server, Zap } from 'lucide-react';

import { Badge } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { TBody, THead, Table } from '../../components/ui/Table';
import { apiFetch } from '../../lib/api';
import { cn } from '../../lib/cn';
import type { MonitoringSnapshot } from '@eak/shared';

const SERVICE_META = {
  api: { label: 'API', Icon: Server },
  worker: { label: 'Worker', Icon: Zap },
  postgres: { label: 'Postgres', Icon: Database },
  redis: { label: 'Redis', Icon: Database },
  telegram: { label: 'Telegram', Icon: Radio },
} as const;

export function MonitoringPage(): JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ['monitoring', 'snapshot'],
    queryFn: () => apiFetch<MonitoringSnapshot>('/monitoring/snapshot'),
    refetchInterval: 5_000,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Live Monitoring" description="Memuat snapshot…" />
        <div className="skeleton h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Monitoring"
        description="Status layanan + status queue (diperbarui tiap 5 detik). WebSocket siap untuk live events."
        actions={
          <Badge tone="ok" pulse>
            Live
          </Badge>
        }
      />

      <Card>
        <CardHeader title="Services" subtitle="Health check per layanan inti" icon={<Activity size={14} />} />
        <CardBody className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(Object.keys(SERVICE_META) as Array<keyof typeof SERVICE_META>).map((k) => {
            const { label, Icon } = SERVICE_META[k];
            const status = data.services[k];
            const tone = status === 'ok' ? 'ok' : status === 'degraded' ? 'warn' : 'bad';
            return (
              <div key={k} className="bg-sunk rounded-lg px-3.5 py-3 border border-line-soft">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={cn(
                      'w-8 h-8 rounded-lg grid place-items-center',
                      status === 'ok' ? 'bg-ok/10 text-ok' : status === 'degraded' ? 'bg-warn/10 text-warn' : 'bg-bad/10 text-bad',
                    )}
                  >
                    <Icon size={16} />
                  </span>
                  <Badge tone={tone} pulse={status === 'ok'}>
                    {status}
                  </Badge>
                </div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-muted uppercase tracking-wider">{k}</p>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Queue stats" subtitle="BullMQ counters tiap queue" icon={<Zap size={14} />} />
        <CardBody className="pt-0">
          <Table>
            <THead>
              <tr>
                <th>Queue</th>
                <th className="r">Waiting</th>
                <th className="r">Active</th>
                <th className="r">Delayed</th>
                <th className="r">Failed</th>
              </tr>
            </THead>
            <TBody>
              {data.queues.map((q) => (
                <tr key={q.name}>
                  <td className="mono">{q.name}</td>
                  <td className="r tabular">{q.waiting}</td>
                  <td className="r tabular text-ok font-semibold">{q.active}</td>
                  <td className="r tabular">{q.delayed}</td>
                  <td className={cn('r tabular font-semibold', q.failed > 0 ? 'text-bad' : 'text-muted')}>{q.failed}</td>
                </tr>
              ))}
            </TBody>
          </Table>
        </CardBody>
      </Card>

      {data.recentErrors.length > 0 && (
        <Card>
          <CardHeader title="Recent errors" icon={<AlertTriangle size={14} />} />
          <CardBody>
            <ul className="space-y-2">
              {data.recentErrors.map((e) => (
                <li key={e.id} className="text-xs flex items-start gap-2">
                  <span className="text-muted tabular">{new Date(e.at).toLocaleTimeString('id-ID')}</span>
                  <span className="font-mono text-tg-ink">{e.queue}</span>
                  <span className="flex-1 text-fg">{e.message}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
