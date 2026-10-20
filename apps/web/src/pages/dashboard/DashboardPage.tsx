import { useQuery } from '@tanstack/react-query';
import { Activity, Compass, Database, Megaphone, Send, Users } from 'lucide-react';

import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Kpi } from '../../components/ui/Kpi';
import { PageHeader } from '../../components/ui/PageHeader';
import { Progress } from '../../components/ui/Progress';
import { apiFetch } from '../../lib/api';
import type { DashboardSummary } from '@eak/shared';

export function DashboardPage(): JSX.Element {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => apiFetch<DashboardSummary>('/dashboard/summary'),
    refetchInterval: 15_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Memuat ringkasan…" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-[120px]" />
          ))}
        </div>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <Card>
          <CardBody>
            <EmptyState title="Gagal memuat ringkasan" description="Coba refresh halaman — API mungkin belum siap." />
          </CardBody>
        </Card>
      </div>
    );
  }

  const totalBroadcast = data.broadcast7d.sent + data.broadcast7d.failed;
  const successRate = totalBroadcast > 0 ? (data.broadcast7d.sent / totalBroadcast) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Ringkasan satu halaman untuk tenant Anda — angka diperbarui tiap 15 detik."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Akun Telegram"
          value={data.accounts.total}
          icon={<Users size={16} />}
          tone="tg"
          footer={<span className="text-ok font-medium">{data.accounts.byStatus.active} aktif</span>}
        />
        <Kpi
          label="Grup di-join"
          value={data.join.joinedGroups}
          icon={<Database size={16} />}
          tone="violet"
          footer={<span>{data.join.queue.pending} pending</span>}
        />
        <Kpi
          label="Link ditemukan"
          value={data.discovery.linksFound}
          icon={<Compass size={16} />}
          tone="warn"
          footer={<span>{data.discovery.queue.pending} belum diproses</span>}
        />
        <Kpi
          label="Campaign Aktif"
          value={data.campaigns.running + data.campaigns.scheduled}
          icon={<Megaphone size={16} />}
          tone="ok"
          footer={
            <span>
              {data.campaigns.running} running · {data.campaigns.scheduled} scheduled
            </span>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.75fr_1fr] gap-4">
        <Card>
          <CardHeader
            title="Broadcast 7 hari terakhir"
            subtitle={`Success rate ${successRate.toFixed(1)}%`}
            icon={<Send size={14} />}
          />
          <CardBody>
            <div className="flex items-end gap-6">
              <div>
                <p className="text-xs text-muted">Terkirim</p>
                <p className="text-3xl font-bold tabular text-ok leading-none mt-1">{data.broadcast7d.sent}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Gagal</p>
                <p className="text-3xl font-bold tabular text-bad leading-none mt-1">{data.broadcast7d.failed}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs text-muted mb-1.5">
                  <span>Rate harian rata-rata</span>
                  <span className="tabular">{Math.round(totalBroadcast / 7)}/hari</span>
                </div>
                <Progress value={successRate} tone="ok" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Status Akun" icon={<Activity size={14} />} />
          <CardBody className="grid grid-cols-2 gap-3 text-sm">
            {(['active', 'warming', 'flood_wait', 'disconnected', 'banned', 'error'] as const).map((k) => {
              const n = data.accounts.byStatus[k] ?? 0;
              return (
                <div key={k} className="bg-sunk rounded-lg px-3 py-2.5">
                  <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">{k.replace('_', ' ')}</p>
                  <p className="font-bold tabular text-lg mt-0.5">{n}</p>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
