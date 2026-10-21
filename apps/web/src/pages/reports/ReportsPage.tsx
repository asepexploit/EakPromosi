import type { DashboardSummary } from '@eak/shared';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Download, Send } from 'lucide-react';
import { useState } from 'react';

import { BarChart } from '../../components/charts/BarChart';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Kpi } from '../../components/ui/Kpi';
import { PageHeader } from '../../components/ui/PageHeader';
import { SegGroup } from '../../components/ui/Tabs';
import { apiFetch } from '../../lib/api';
import { formatCompact, formatPct } from '../../lib/format';

type Range = '7' | '14' | '30';

export function ReportsPage(): JSX.Element {
  const [range, setRange] = useState<Range>('7');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'summary', 'reports'],
    queryFn: () => apiFetch<DashboardSummary>('/dashboard/summary'),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Statistics & Reports" description="Memuat agregat…" />
        <div className="skeleton h-[320px]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Statistics & Reports" description="Agregat per periode, bersumber dari worker reports:aggregate." />
        <Card>
          <CardBody>
            <EmptyState
              icon={<BarChart3 size={24} />}
              title="Belum ada data"
              description="Agregat harian/mingguan akan muncul setelah worker reports:aggregate memproses minimal 1 periode."
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  const daily = data.broadcast7d.daily.slice(-(range === '7' ? 7 : range === '14' ? 14 : 30));
  const totalSent = data.broadcast7d.sent;
  const totalFailed = data.broadcast7d.failed;
  const totalBroadcast = totalSent + totalFailed;
  const successRate = totalBroadcast > 0 ? totalSent / totalBroadcast : null;

  const avgPerDay = daily.length > 0 ? totalBroadcast / daily.length : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistics & Reports"
        description="Agregat per periode (streaming CSV untuk dataset besar via /reports/export)."
        actions={
          <>
            <SegGroup
              options={[
                { id: '7', label: '7 hari' },
                { id: '14', label: '14 hari' },
                { id: '30', label: '30 hari' },
              ]}
              value={range}
              onChange={(v) => setRange(v)}
            />
            <Button variant="outline" size="sm" onClick={() => window.open('/reports/export', '_blank')}>
              <Download size={14} /> Export CSV
            </Button>
          </>
        }
      />

      <Alert
        tone="info"
        title={`Periode: ${range} hari terakhir`}
        description="Data berasal dari materialized view ringkas (bukan query live). Rentang kustom tersedia di endpoint export."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Total terkirim" value={formatCompact(totalSent)} tone="ok" icon={<Send size={16} />} />
        <Kpi label="Total gagal" value={formatCompact(totalFailed)} tone="bad" />
        <Kpi label="Keberhasilan" value={formatPct(successRate)} tone="tg" />
        <Kpi label="Rata-rata / hari" value={formatCompact(avgPerDay)} tone="violet" />
      </div>

      <Card>
        <CardHeader title="Broadcast per hari" subtitle="Berhasil vs gagal" icon={<BarChart3 size={14} />} />
        <CardBody>
          <BarChart
            rows={daily}
            xKey="day"
            xFormat={(v) => (typeof v === 'string' ? v.slice(5) : String(v ?? ''))}
            series={[
              { key: 'sent', label: 'Berhasil', color: 'rgb(var(--tg))' },
              { key: 'failed', label: 'Gagal', color: 'rgb(var(--bad))' },
            ]}
            stacked
            height={260}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Antrean per domain" subtitle="Pending / processing / failed per modul" />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <QueueBlock title="Discovery" counters={data.discovery.queue} />
            <QueueBlock title="Join" counters={data.join.queue} />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function QueueBlock({
  title,
  counters,
}: {
  title: string;
  counters: { pending: number; processing: number; failed: number };
}): JSX.Element {
  const rows = [
    { key: 'label', pending: counters.pending, processing: counters.processing, failed: counters.failed, label: title },
  ];
  return (
    <div className="bg-sunk rounded-lg p-4">
      <p className="text-sm font-semibold mb-3">{title}</p>
      <BarChart
        rows={rows}
        xKey="label"
        series={[
          { key: 'pending', label: 'Pending', color: 'rgb(var(--warn))' },
          { key: 'processing', label: 'Processing', color: 'rgb(var(--tg))' },
          { key: 'failed', label: 'Failed', color: 'rgb(var(--bad))' },
        ]}
        height={160}
      />
    </div>
  );
}
