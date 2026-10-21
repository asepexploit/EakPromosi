import type { DashboardSummary } from '@eak/shared';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, LinkIcon, UserPlus } from 'lucide-react';

import { Alert } from '../../components/ui/Alert';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Kpi } from '../../components/ui/Kpi';
import { PageHeader } from '../../components/ui/PageHeader';
import { Progress } from '../../components/ui/Progress';
import { apiFetch } from '../../lib/api';
import { formatNumber } from '../../lib/format';

export function MembershipPage(): JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'summary', 'membership'],
    queryFn: () => apiFetch<DashboardSummary>('/dashboard/summary'),
    retry: false,
    refetchInterval: 15_000,
  });

  const pending = data?.join.queue.pending ?? 0;
  const processing = data?.join.queue.processing ?? 0;
  const failed = data?.join.queue.failed ?? 0;
  const joined = data?.join.joinedGroups ?? 0;
  const total = joined + pending + processing + failed;
  const pct = total > 0 ? (joined / total) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auto Join & Membership Sync"
        description="Antrean join otomatis dari hasil Discovery, plus sinkronisasi berkala apakah akun masih member."
      />

      <Alert
        tone="warn"
        title="Rate limit penting"
        description="Akun baru maks 20 join/hari; naik bertahap setelah 7 hari aktif. Flood-wait otomatis dihormati (job di-delay bukan di-retry)."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Berhasil bergabung" value={formatNumber(joined)} tone="ok" icon={<UserPlus size={16} />} />
        <Kpi label="Antre" value={formatNumber(pending)} tone="tg" />
        <Kpi label="Memproses" value={formatNumber(processing)} tone="violet" />
        <Kpi label="Gagal" value={formatNumber(failed)} tone="bad" icon={<AlertTriangle size={16} />} />
      </div>

      <Card>
        <CardHeader
          title="Progres join hari ini"
          subtitle="Join dieksekusi oleh worker telegram:join dengan honor flood-wait dan rate-limit per akun."
          icon={<LinkIcon size={14} />}
        />
        <CardBody>
          {isLoading ? (
            <div className="skeleton h-[80px]" />
          ) : total === 0 ? (
            <EmptyState
              icon={<LinkIcon size={24} />}
              title="Belum ada antrean join"
              description="Antrean terisi otomatis saat Discovery menemukan link baru, atau tambah manual dari Inventory."
            />
          ) : (
            <>
              <div className="flex justify-between text-xs text-muted mb-2">
                <span>
                  <span className="font-semibold text-fg tabular">{formatNumber(joined)}</span> dari{' '}
                  <span className="tabular">{formatNumber(total)}</span> target
                </span>
                <span className="tabular">{Math.round(pct)}%</span>
              </div>
              <Progress value={pct} tone={failed > 0 ? 'warn' : 'ok'} striped={processing > 0} />
              <ul className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 text-sm">
                <StatRow label="Antre" value={pending} tone="muted" />
                <StatRow label="Memproses" value={processing} tone="info" />
                <StatRow label="Berhasil" value={joined} tone="ok" />
                <StatRow label="Gagal" value={failed} tone="bad" />
              </ul>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function StatRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'ok' | 'bad' | 'info' | 'muted';
}): JSX.Element {
  const color =
    tone === 'ok' ? 'text-ok' : tone === 'bad' ? 'text-bad' : tone === 'info' ? 'text-tg-ink' : 'text-muted';
  return (
    <li className="bg-sunk rounded-lg px-3 py-2">
      <span className="text-[11.5px] text-muted">{label}</span>
      <span className={`block text-lg font-bold tabular tracking-tight ${color}`}>{formatNumber(value)}</span>
    </li>
  );
}
