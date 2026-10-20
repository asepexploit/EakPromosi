import { useQuery } from '@tanstack/react-query';
import { Megaphone, PauseCircle, Plus } from 'lucide-react';

import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Kpi } from '../../components/ui/Kpi';
import { PageHeader } from '../../components/ui/PageHeader';
import { Progress } from '../../components/ui/Progress';
import { TBody, THead, Table, TMain, TSub } from '../../components/ui/Table';
import { apiFetch } from '../../lib/api';
import type { BroadcastStatus, BroadcastSummary } from '@eak/shared';

const STATUS_TONE: Record<BroadcastStatus, BadgeTone> = {
  draft: 'default',
  queued: 'info',
  sending: 'info',
  completed: 'ok',
  failed: 'bad',
  paused: 'warn',
  canceled: 'default',
};

export function BroadcastsPage(): JSX.Element {
  const { data = [], isLoading } = useQuery({
    queryKey: ['broadcasts'],
    queryFn: () => apiFetch<BroadcastSummary[]>('/broadcasts'),
    refetchInterval: 10_000,
  });

  const totals = data.reduce(
    (acc, b) => {
      acc.targets += b.totalTargets;
      acc.sent += b.sentCount;
      acc.failed += b.failedCount;
      if (b.status === 'sending' || b.status === 'queued') acc.active += 1;
      return acc;
    },
    { targets: 0, sent: 0, failed: 0, active: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auto Broadcast"
        description="Mesin kirim pesan — hanya ke grup dengan allow_promotion=true. Jitter 20–60s antar pesan per akun."
        actions={
          <Button variant="primary">
            <Plus size={14} /> Broadcast Baru
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Total targets" value={totals.targets} icon={<Megaphone size={16} />} tone="tg" />
        <Kpi label="Sent" value={totals.sent} tone="ok" />
        <Kpi label="Failed" value={totals.failed} tone="bad" />
        <Kpi label="Active" value={totals.active} tone="warn" icon={<PauseCircle size={16} />} />
      </div>

      <Card>
        <CardHeader title={`Broadcast terbaru (${data.length})`} icon={<Megaphone size={14} />} />
        <CardBody className="pt-0">
          {isLoading ? (
            <div className="skeleton h-[200px]" />
          ) : data.length === 0 ? (
            <EmptyState
              icon={<Megaphone size={24} />}
              title="Belum ada broadcast"
              description="Buat broadcast baru untuk kirim pesan ke grup yang mengizinkan promosi."
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <th>Judul</th>
                  <th>Progress</th>
                  <th className="r">Sent</th>
                  <th className="r">Failed</th>
                  <th>Status</th>
                </tr>
              </THead>
              <TBody>
                {data.map((b) => {
                  const pct = b.totalTargets > 0 ? ((b.sentCount + b.failedCount) / b.totalTargets) * 100 : 0;
                  return (
                    <tr key={b.id}>
                      <td>
                        <TMain>{b.title}</TMain>
                        <TSub>{new Date(b.createdAt).toLocaleString('id-ID')}</TSub>
                      </td>
                      <td>
                        <div className="min-w-[160px]">
                          <Progress value={pct} tone={b.failedCount > 0 ? 'warn' : 'tg'} />
                          <p className="text-[11px] text-muted mt-1 tabular">
                            {b.sentCount + b.failedCount}/{b.totalTargets}
                          </p>
                        </div>
                      </td>
                      <td className="r tabular text-ok font-semibold">{b.sentCount}</td>
                      <td className="r tabular text-bad font-semibold">{b.failedCount}</td>
                      <td>
                        <Badge tone={STATUS_TONE[b.status]} pulse={b.status === 'sending'}>
                          {b.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
