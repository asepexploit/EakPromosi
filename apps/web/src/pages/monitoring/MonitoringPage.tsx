import type { MonitoringSnapshot } from '@eak/shared';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Radio,
  Server,
  Siren,
  Zap,
} from 'lucide-react';

import { Badge } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { TBody, THead, Table } from '../../components/ui/Table';
import { apiFetch } from '../../lib/api';
import { cn } from '../../lib/cn';
import { formatTime } from '../../lib/format';

const SERVICE_META = {
  api: { label: 'API', Icon: Server },
  worker: { label: 'Worker', Icon: Zap },
  postgres: { label: 'Postgres', Icon: Database },
  redis: { label: 'Redis', Icon: Database },
  telegram: { label: 'Telegram DC', Icon: Radio },
} as const;

export function MonitoringPage(): JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ['monitoring', 'snapshot'],
    queryFn: () => apiFetch<MonitoringSnapshot>('/monitoring/snapshot'),
    refetchInterval: 5_000,
    retry: false,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Live Monitoring" description="Memuat snapshot…" />
        <div className="skeleton h-[400px]" />
      </div>
    );
  }

  const anyFailure = data.queues.some((q) => q.failed > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Monitoring"
        description="Status layanan + status queue (diperbarui tiap 5 detik). WebSocket siap untuk live events."
        actions={
          <Badge tone="ok" pulse>
            Realtime
          </Badge>
        }
      />

      <div className="flex items-center gap-3 p-4 rounded-xl border border-bad/30 bg-bad/[0.04]">
        <div className="w-10 h-10 rounded-xl bg-bad/10 text-bad grid place-items-center flex-none">
          <Siren size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Kontrol penghentian darurat</p>
          <p className="text-xs text-muted">
            Hentikan seketika broadcast, auto-join, deteksi link, dan auto-reply di semua akun — gunakan tombol siren di
            topbar.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader title="Services" subtitle="Health check per layanan inti" icon={<Activity size={14} />} />
        <CardBody className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(Object.keys(SERVICE_META) as Array<keyof typeof SERVICE_META>).map((k) => {
            const { label, Icon } = SERVICE_META[k];
            const status = data.services[k];
            const tone = status === 'ok' ? 'ok' : status === 'degraded' ? 'warn' : 'bad';
            return (
              <div key={k} className="bg-sunk rounded-lg px-3.5 py-3 border border-line">
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
        <CardHeader
          title="Queue stats"
          subtitle="BullMQ counters tiap queue"
          icon={<Zap size={14} />}
          actions={
            anyFailure ? (
              <Badge tone="bad">Ada antrean gagal</Badge>
            ) : (
              <Badge tone="ok" dot={false}>
                Semua sehat
              </Badge>
            )
          }
        />
        <CardBody className="pt-0">
          <Table>
            <THead>
              <tr>
                <th>Queue</th>
                <th className="r">Waiting</th>
                <th className="r">Active</th>
                <th className="r">Delayed</th>
                <th className="r">Completed 24h</th>
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
                  <td className="r tabular text-muted">{q.completed24h}</td>
                  <td className={cn('r tabular font-semibold', q.failed > 0 ? 'text-bad' : 'text-muted')}>{q.failed}</td>
                </tr>
              ))}
            </TBody>
          </Table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              Log error terbaru
              <Badge tone={data.recentErrors.length > 0 ? 'bad' : 'ok'} dot={false}>
                {data.recentErrors.length}
              </Badge>
            </span>
          }
          icon={<AlertTriangle size={14} />}
        />
        <CardBody className="pt-0">
          {data.recentErrors.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={22} />}
              title="Tidak ada error"
              description="Semua worker berjalan tanpa masalah."
            />
          ) : (
            <div className="bg-[#0E1621] text-[#C9D6E3] rounded-xl border border-[#1d2a3a] overflow-hidden">
              <div className="font-mono text-xs max-h-[400px] overflow-y-auto scrollbar-thin">
                {data.recentErrors.map((e) => (
                  <div key={e.id} className="grid grid-cols-[70px_90px_minmax(0,1fr)] gap-2.5 px-3.5 py-1.5 border-l-2 border-transparent hover:bg-white/[0.03]">
                    <span className="text-[#5f7488] tabular">{formatTime(e.at)}</span>
                    <span className="text-[#fbbf24] font-bold tracking-wide">{e.queue}</span>
                    <span className="text-[#c9d6e3] break-words">{e.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
