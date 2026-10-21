import type { DashboardSummary, DiscoveredLink } from '@eak/shared';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Compass,
  Database,
  LayoutDashboard,
  Megaphone,
  Plus,
  Send,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { BarChart } from '../../components/charts/BarChart';
import { HorizontalBar } from '../../components/charts/HorizontalBar';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { KpiMini3 } from '../../components/ui/KpiMini';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { SegGroup } from '../../components/ui/Tabs';
import { apiFetch } from '../../lib/api';
import { cn } from '../../lib/cn';
import { formatAgo, formatCompact, formatNumber, formatPct, greeting } from '../../lib/format';
import { useAuthStore } from '../../stores/auth';

export function DashboardPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.displayName?.split(' ')[0] ?? '';
  const [range, setRange] = useState<'7' | '14' | '30'>('7');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => apiFetch<DashboardSummary>('/dashboard/summary'),
    refetchInterval: 20_000,
    retry: false,
  });

  // Discovery funnel (optional data — degrades to empty if endpoint missing).
  const { data: links = [] } = useQuery({
    queryKey: ['discovery', 'links', 'dashboard'],
    queryFn: () => apiFetch<DiscoveredLink[]>('/discovery/links', { query: { limit: 500 } }),
    staleTime: 60_000,
    retry: false,
  });

  const daily = useMemo(() => {
    if (!data) return [];
    const n = range === '7' ? 7 : range === '14' ? 14 : 30;
    return data.broadcast7d.daily.slice(-n);
  }, [data, range]);

  const totalSent = data?.broadcast7d.sent ?? 0;
  const totalFailed = data?.broadcast7d.failed ?? 0;
  const totalBroadcast = totalSent + totalFailed;
  const successRate = totalBroadcast > 0 ? totalSent / totalBroadcast : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Memuat ringkasan…" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[160px]" />
          ))}
        </div>
        <Skeleton className="h-[320px]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title={firstName ? `${greeting()}, ${firstName}` : 'Dashboard'} description="Ringkasan tenant" />
        <Card>
          <CardBody>
            <EmptyState
              icon={<LayoutDashboard size={24} />}
              title="Belum ada data"
              description="API dashboard belum siap atau belum ada aktivitas. Mulai dari menambahkan akun Telegram."
              action={
                <Link to="/accounts">
                  <Button variant="primary" size="sm">
                    <Plus size={14} /> Tambah akun
                  </Button>
                </Link>
              }
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  const activeAccounts = data.accounts.byStatus.active ?? 0;
  const warnAccounts =
    (data.accounts.byStatus.warming ?? 0) +
    (data.accounts.byStatus.flood_wait ?? 0) +
    (data.accounts.byStatus.error ?? 0);
  const badAccounts = (data.accounts.byStatus.disconnected ?? 0) + (data.accounts.byStatus.banned ?? 0);

  const linksTotal = links.length;
  const linksValid = links.filter((l) => l.status === 'valid').length;
  const linksPending = links.filter((l) => l.status === 'pending').length;

  const funnel = [
    { label: 'Terdeteksi', value: linksTotal, color: 'rgb(var(--tg))' },
    { label: 'Valid', value: linksValid, color: 'rgb(var(--tg))' },
    { label: 'Antre di-join', value: data.join.queue.pending + data.join.queue.processing, color: 'rgb(var(--violet))' },
    { label: 'Berhasil join', value: data.join.joinedGroups, color: 'rgb(var(--ok))' },
  ];

  const alerts = buildAlerts(data);
  const takeaway =
    totalBroadcast === 0 && data.campaigns.running + data.campaigns.scheduled === 0
      ? 'Belum ada aktivitas. Tambah akun Telegram untuk mulai.'
      : `${formatNumber(totalSent)} broadcast terkirim · ${
          successRate === null ? '—' : formatPct(successRate)
        } keberhasilan · ${data.campaigns.running + data.campaigns.scheduled} campaign aktif.`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={firstName ? `${greeting()}, ${firstName} 👋` : 'Dashboard'}
        description={takeaway}
        actions={
          <>
            <Link to="/reports">
              <Button variant="outline" size="sm">
                <BarChart3 size={14} /> Laporan
              </Button>
            </Link>
            <Link to="/campaigns">
              <Button variant="primary" size="sm">
                <Plus size={14} /> Campaign baru
              </Button>
            </Link>
          </>
        }
      />

      {alerts.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {alerts.map((a, i) => (
            <Alert key={i} tone={a.tone} title={a.title} description={a.description} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          label="Akun Telegram"
          icon={<Users size={16} />}
          tone="tg"
          value={formatNumber(activeAccounts)}
          suffix={<span className="text-sm font-medium text-muted ml-1">aktif</span>}
          mini={[
            { label: 'Terhubung', value: activeAccounts, tone: 'ok' },
            { label: 'Perhatian', value: warnAccounts, tone: warnAccounts > 0 ? 'warn' : 'muted' },
            { label: 'Terputus', value: badAccounts, tone: badAccounts > 0 ? 'bad' : 'muted' },
          ]}
        />
        <KpiCard
          label="Grup & channel"
          icon={<Database size={16} />}
          tone="violet"
          value={formatNumber(data.join.joinedGroups)}
          suffix={<span className="text-sm font-medium text-muted ml-1">diikuti</span>}
          mini={[
            { label: 'Ditemukan', value: formatNumber(linksTotal) },
            { label: 'Antre', value: formatNumber(data.join.queue.pending) },
            { label: 'Gagal', value: formatNumber(data.join.queue.failed), tone: data.join.queue.failed > 0 ? 'warn' : 'muted' },
          ]}
        />
        <KpiCard
          label="Campaign"
          icon={<Megaphone size={16} />}
          tone="ok"
          value={formatNumber(data.campaigns.running + data.campaigns.scheduled)}
          suffix={<span className="text-sm font-medium text-muted ml-1">aktif</span>}
          mini={[
            { label: 'Berjalan', value: data.campaigns.running, tone: data.campaigns.running > 0 ? 'ok' : 'muted' },
            { label: 'Terjadwal', value: data.campaigns.scheduled },
            { label: 'Antrean', value: formatNumber(data.discovery.queue.pending) },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.75fr_1fr] gap-4">
        <Card>
          <CardHeader
            title="Statistik broadcast"
            subtitle="Pesan berhasil dan gagal per hari"
            icon={<Send size={14} />}
            actions={
              <SegGroup
                options={[
                  { id: '7', label: '7 hari' },
                  { id: '14', label: '14 hari' },
                  { id: '30', label: '30 hari' },
                ]}
                value={range}
                onChange={(v) => setRange(v)}
              />
            }
          />
          <CardBody>
            <div className="flex flex-wrap gap-6 mb-4">
              <StatBlock label="Terkirim" value={formatCompact(totalSent)} tone={totalSent > 0 ? 'ok' : 'muted'} />
              <StatBlock label="Gagal" value={formatCompact(totalFailed)} tone={totalFailed > 0 ? 'bad' : 'muted'} />
              <StatBlock label="Keberhasilan" value={successRate === null ? '—' : formatPct(successRate)} {...(successRate === null ? { tone: 'muted' as const } : {})} />
              {totalBroadcast > 0 && (
                <div className="ml-auto flex items-center gap-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <i className="w-2 h-2 rounded-sm" style={{ background: 'rgb(var(--tg))' }} />
                    Berhasil
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <i className="w-2 h-2 rounded-sm bg-bad" />
                    Gagal
                  </span>
                </div>
              )}
            </div>
            {totalBroadcast === 0 ? (
              <div className="relative h-[240px] rounded-lg bg-sunk/40 border border-dashed border-line grid place-items-center overflow-hidden">
                <div className="absolute inset-x-6 bottom-6 flex items-end gap-2 opacity-30 pointer-events-none" aria-hidden>
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-tg/40"
                      style={{ height: `${20 + Math.round(Math.sin(i * 0.9) * 30 + 40)}px` }}
                    />
                  ))}
                </div>
                <div className="relative z-10 text-center max-w-xs px-4">
                  <p className="text-sm font-semibold text-fg">Belum ada broadcast</p>
                  <p className="text-xs text-muted mt-1">
                    Grafik akan terisi setelah campaign pertama mengirim pesan.
                  </p>
                </div>
              </div>
            ) : (
              <BarChart
                rows={daily}
                xKey="day"
                xFormat={(v) => (typeof v === 'string' ? v.slice(5) : String(v ?? ''))}
                series={[
                  { key: 'sent', label: 'Berhasil', color: 'rgb(var(--tg))' },
                  { key: 'failed', label: 'Gagal', color: 'rgb(var(--bad))' },
                ]}
                stacked
                height={240}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Status akun" subtitle="Kesehatan akun Telegram" icon={<Activity size={14} />} />
          <CardBody className="pt-0">
            {data.accounts.total === 0 ? (
              <EmptyState
                icon={<Users size={22} />}
                title="Belum ada akun"
                description="Hubungkan akun Telegram pertama untuk mulai automation."
                action={
                  <Link to="/accounts">
                    <Button variant="primary" size="sm">
                      <Plus size={14} /> Tambah akun
                    </Button>
                  </Link>
                }
              />
            ) : (
              <AccountHealthList data={data} />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                Aktivitas terbaru
                <Badge tone="ok" pulse>
                  Live
                </Badge>
              </span>
            }
            subtitle="Semua modul automation"
            icon={<Activity size={14} />}
            actions={
              <Link to="/monitoring">
                <Button variant="ghost" size="sm">
                  Monitor <ArrowRight size={13} />
                </Button>
              </Link>
            }
          />
          <CardBody className="pt-0">
            {data.activity.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 size={22} />}
                title="Belum ada aktivitas"
                description="Aktivitas worker akan muncul di sini begitu automation berjalan."
              />
            ) : (
              <ul className="divide-y divide-line">
                {data.activity.slice(0, 8).map((e) => (
                  <li key={e.id} className="py-2.5 flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg grid place-items-center flex-none ${
                        e.level === 'error'
                          ? 'bg-bad/10 text-bad'
                          : e.level === 'warning'
                            ? 'bg-warn/10 text-warn'
                            : e.level === 'success'
                              ? 'bg-ok/10 text-ok'
                              : 'bg-tg/10 text-tg-ink'
                      }`}
                    >
                      {e.level === 'error' ? (
                        <AlertCircle size={14} />
                      ) : e.level === 'warning' ? (
                        <AlertTriangle size={14} />
                      ) : e.level === 'success' ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <Activity size={14} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{e.message}</p>
                      <p className="text-xs text-muted capitalize">{e.domain}</p>
                    </div>
                    <span className="text-[11.5px] text-muted tabular whitespace-nowrap">{formatAgo(e.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Alur link → join"
            subtitle="Dari deteksi hingga bergabung"
            icon={<Compass size={14} />}
            actions={
              <Link to="/discovery">
                <Button variant="ghost" size="sm">
                  Detail <ArrowRight size={13} />
                </Button>
              </Link>
            }
          />
          <CardBody>
            {linksTotal === 0 ? (
              <EmptyState
                title="Belum ada link ditemukan"
                description="Mulai Auto Discovery untuk mengumpulkan tautan grup/channel."
              />
            ) : (
              <HorizontalBar items={funnel} max={linksTotal || 1} />
            )}
            <p className="text-xs text-muted mt-2">
              {formatNumber(linksPending)} link menunggu validasi
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

interface Alert {
  tone: 'info' | 'warn' | 'bad';
  title: string;
  description?: string;
}

function buildAlerts(d: DashboardSummary): Alert[] {
  const out: Alert[] = [];
  const disc = d.accounts.byStatus.disconnected ?? 0;
  if (disc > 0) {
    out.push({
      tone: 'bad',
      title: `${disc} akun Telegram terputus`,
      description: 'Automation yang memakai akun ini tertahan sampai dihubungkan ulang.',
    });
  }
  const flood = d.accounts.byStatus.flood_wait ?? 0;
  if (flood > 0) {
    out.push({
      tone: 'warn',
      title: `${flood} akun sedang FloodWait`,
      description: 'Pengiriman dijeda otomatis untuk mencegah pembatasan permanen dari Telegram.',
    });
  }
  if (d.join.queue.failed > 0) {
    out.push({
      tone: 'warn',
      title: `${d.join.queue.failed} job join gagal`,
      description: 'Periksa log untuk melihat alasan dan coba manual retry bila diperlukan.',
    });
  }
  return out;
}

function KpiCard({
  label,
  icon,
  tone,
  value,
  suffix,
  mini,
}: {
  label: string;
  icon: React.ReactNode;
  tone: 'tg' | 'ok' | 'violet' | 'warn';
  value: React.ReactNode;
  suffix?: React.ReactNode;
  mini?: ReadonlyArray<{ label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'bad' | 'muted' }>;
}): JSX.Element {
  return (
    <div className="bg-panel border border-line rounded-lg shadow-card p-4 flex flex-col overflow-hidden min-w-0 transition-all hover:border-tg/30 hover:shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] uppercase tracking-wider text-muted font-semibold">{label}</p>
        <span
          className={cn(
            'w-8 h-8 rounded-lg grid place-items-center flex-none',
            tone === 'tg' && 'bg-tg/10 text-tg-ink',
            tone === 'ok' && 'bg-ok/10 text-ok',
            tone === 'violet' && 'bg-violet/10 text-violet',
            tone === 'warn' && 'bg-warn/10 text-warn',
          )}
        >
          {icon}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5 min-w-0">
        <p className="text-[30px] font-bold leading-none tracking-tight tabular text-fg">{value}</p>
        {suffix}
      </div>
      {mini && <KpiMini3 items={mini} />}
    </div>
  );
}

function StatBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'ok' | 'bad' | 'muted';
}): JSX.Element {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted">{label}</span>
      <span
        className={`text-lg font-bold tabular leading-tight mt-0.5 ${
          tone === 'ok' ? 'text-ok' : tone === 'bad' ? 'text-bad' : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
}

const STATUS_META: Record<
  'active' | 'warming' | 'flood_wait' | 'disconnected' | 'banned' | 'error',
  { label: string; tone: 'ok' | 'warn' | 'bad' | 'muted' }
> = {
  active: { label: 'Aktif', tone: 'ok' },
  warming: { label: 'Warming', tone: 'warn' },
  flood_wait: { label: 'Flood wait', tone: 'warn' },
  disconnected: { label: 'Terputus', tone: 'bad' },
  banned: { label: 'Banned', tone: 'bad' },
  error: { label: 'Error', tone: 'bad' },
};

function AccountHealthList({ data }: { data: DashboardSummary }): JSX.Element {
  const total = data.accounts.total;
  const rows = (Object.keys(STATUS_META) as Array<keyof typeof STATUS_META>)
    .map((k) => ({ key: k, count: data.accounts.byStatus[k] ?? 0 }))
    .filter((r) => r.count > 0 || r.key === 'active'); // keep 'active' row for context when 0
  return (
    <ul className="divide-y divide-line">
      {rows.map(({ key, count }) => {
        const meta = STATUS_META[key];
        const pct = total === 0 ? 0 : (count / total) * 100;
        return (
          <li key={key} className="py-3 flex items-center gap-3">
            <span
              className={cn(
                'w-2 h-2 rounded-full flex-none',
                meta.tone === 'ok' && 'bg-ok',
                meta.tone === 'warn' && 'bg-warn',
                meta.tone === 'bad' && 'bg-bad',
                meta.tone === 'muted' && 'bg-muted/60',
              )}
            />
            <span className="text-sm flex-1 min-w-0 truncate">{meta.label}</span>
            <span className="text-xs text-muted tabular w-10 text-right">{Math.round(pct)}%</span>
            <span className="text-sm font-semibold tabular w-8 text-right">{count}</span>
          </li>
        );
      })}
    </ul>
  );
}
