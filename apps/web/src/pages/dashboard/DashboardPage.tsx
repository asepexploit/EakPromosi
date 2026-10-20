import { useQuery } from '@tanstack/react-query';

import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { apiFetch } from '../../lib/api';
import type { DashboardSummary } from '@eak/shared';

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }): JSX.Element {
  return (
    <Card>
      <CardBody className="space-y-1">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-2xl font-semibold tabular">{value}</p>
        {hint && <p className="text-[11px] text-muted">{hint}</p>}
      </CardBody>
    </Card>
  );
}

export function DashboardPage(): JSX.Element {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => apiFetch<DashboardSummary>('/dashboard/summary'),
    refetchInterval: 15_000,
  });

  if (isLoading) return <div className="text-muted text-sm">Memuat ringkasan…</div>;
  if (isError || !data) return <div className="text-bad text-sm">Gagal memuat ringkasan</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-xs text-muted">Ringkasan satu halaman — angka diperbarui tiap 15 detik.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Akun Telegram" value={data.accounts.total} hint={`${data.accounts.byStatus.active} aktif`} />
        <Stat label="Grup di-join" value={data.join.joinedGroups} />
        <Stat label="Link ditemukan" value={data.discovery.linksFound} />
        <Stat label="Campaign aktif" value={data.campaigns.running + data.campaigns.scheduled} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Broadcast 7 hari terakhir" />
          <CardBody>
            <div className="flex items-end gap-4">
              <div>
                <p className="text-xs text-muted">Terkirim</p>
                <p className="text-2xl font-semibold text-ok tabular">{data.broadcast7d.sent}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Gagal</p>
                <p className="text-2xl font-semibold text-bad tabular">{data.broadcast7d.failed}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Status Akun" />
          <CardBody className="grid grid-cols-3 gap-2 text-sm">
            {Object.entries(data.accounts.byStatus).map(([status, count]) => (
              <div key={status}>
                <p className="text-xs text-muted capitalize">{status.replace('_', ' ')}</p>
                <p className="font-semibold tabular">{count}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
