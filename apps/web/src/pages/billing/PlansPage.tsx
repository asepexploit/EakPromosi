import type { BillingPeriod, CreateInvoiceResult, Plan, Subscription } from '@eak/shared';
import { useQuery } from '@tanstack/react-query';
import { Check, CheckCircle2, Crown, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Kpi } from '../../components/ui/Kpi';
import { PageHeader } from '../../components/ui/PageHeader';
import { Progress } from '../../components/ui/Progress';
import { SegGroup } from '../../components/ui/Tabs';
import { apiFetch } from '../../lib/api';
import { cn } from '../../lib/cn';
import { formatDate, formatIdr, formatNumber } from '../../lib/format';
import { useApiMutation } from '../../lib/mutation';
import { SUBSCRIPTION_STATUS } from '../../lib/statusLabels';

export function PlansPage(): JSX.Element {
  const [period, setPeriod] = useState<BillingPeriod>('monthly');

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => apiFetch<Plan[]>('/plans'),
    retry: false,
  });
  const { data: sub } = useQuery({
    queryKey: ['subscriptions', 'current'],
    queryFn: () => apiFetch<Subscription>('/subscriptions/current'),
    retry: false,
  });

  const checkout = useApiMutation(
    (vars: { planCode: string; period: BillingPeriod }) =>
      apiFetch<CreateInvoiceResult>('/billing/checkout', { method: 'POST', json: vars }),
    {
      onSuccess: (res) => {
        window.location.href = res.redirectUrl;
      },
    },
  );

  const statusMeta = sub ? SUBSCRIPTION_STATUS[sub.status] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription & Plans"
        description="Subscription-only — tanpa wallet/credit. Pembayaran via Pakasir dengan aktivasi otomatis saat webhook paid."
      />

      {sub ? (
        <div
          className="relative overflow-hidden rounded-2xl p-6 text-white shadow-tg-glow"
          style={{
            background:
              'radial-gradient(90% 120% at 100% 0%, #5bcbff 0%, transparent 55%), linear-gradient(135deg, #1E88D6 0%, #1462ae 55%, #0f3f7a 100%)',
          }}
        >
          <div className="absolute -right-24 -bottom-40 w-[280px] h-[280px] rounded-full border-[40px] border-white/5" aria-hidden />
          <div className="relative flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm opacity-85 flex items-center gap-1.5">
                <Crown size={13} /> Paket aktif
              </p>
              <p className="text-4xl font-bold tracking-tight mt-1 mb-0.5 capitalize tabular">{sub.planCode}</p>
              <p className="text-sm opacity-85">
                {sub.period === 'monthly' ? 'bulanan' : 'tahunan'}
                {sub.endsAt ? ` · berakhir ${formatDate(sub.endsAt)}` : ' · tanpa masa berlaku'}
              </p>
            </div>
            {statusMeta && (
              <span className="bg-white/20 text-white px-3 py-1.5 rounded-full text-xs font-semibold">
                {statusMeta.label}
              </span>
            )}
          </div>
          <div className="relative mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <UsagePill label="Akun" value={sub.usage.telegramAccounts} />
            <UsagePill label="Campaign aktif" value={sub.usage.concurrentCampaigns} />
            <UsagePill label="Broadcast hari ini" value={sub.usage.broadcastsToday} />
            <UsagePill label="Discovery sources" value={sub.usage.discoverySources} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Memuat langganan" value="—" tone="muted" />
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-bold tracking-tight">Pilih paket</h2>
        <SegGroup
          options={[
            { id: 'monthly', label: 'Bulanan' },
            { id: 'yearly', label: 'Tahunan · hemat 2 bulan' },
          ]}
          value={period}
          onChange={(v) => setPeriod(v)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const isActive = sub?.planCode === p.code;
          const isPopular = p.code === 'pro';
          const price = period === 'monthly' ? p.prices.monthly : p.prices.yearly;
          return (
            <Card
              key={p.id}
              className={cn('relative', isActive && 'ring-2 ring-tg border-tg', isPopular && !isActive && 'border-tg/30')}
            >
              {isPopular && !isActive && (
                <span className="absolute top-3 right-3 bg-ok text-white text-[10.5px] font-bold px-2 py-0.5 rounded-full">
                  Populer
                </span>
              )}
              {isActive && (
                <span className="absolute top-3 right-3 bg-tg text-white text-[10.5px] font-bold px-2 py-0.5 rounded-full">
                  Aktif
                </span>
              )}
              <CardHeader
                title={<span className="capitalize text-base">{p.name}</span>}
                subtitle={p.code === 'free' ? 'Mulai cepat tanpa biaya' : p.code === 'pro' ? 'Untuk tim promosi aktif' : 'Untuk agency / reseller'}
              />
              <CardBody className="space-y-4 pt-0">
                <div>
                  <p className="text-3xl font-bold tabular tracking-tight">{formatIdr(price)}</p>
                  <p className="text-xs text-muted mt-0.5">per {period === 'monthly' ? 'bulan' : 'tahun'}</p>
                </div>
                <ul className="space-y-2 text-sm">
                  {[
                    `${formatNumber(p.limits.maxTelegramAccounts)} akun Telegram`,
                    `${formatNumber(p.limits.maxConcurrentCampaigns)} campaign bersamaan`,
                    `${formatNumber(p.limits.maxBroadcastsPerDay)} broadcast / hari`,
                    `${formatNumber(p.limits.maxDiscoverySources)} discovery sources`,
                    featureLine('Auto Discovery', p.features.autoDiscovery),
                    featureLine('Auto Join', p.features.autoJoin),
                    featureLine('Broadcast', p.features.autoBroadcast),
                    featureLine('Campaign', p.features.campaignManagement),
                    featureLine('Monitoring', p.features.monitoring),
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check size={14} className="text-ok flex-none mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={isActive ? 'secondary' : isPopular ? 'primary' : 'outline'}
                  className="w-full"
                  disabled={isActive || checkout.isPending || price === 0}
                  loading={checkout.isPending && checkout.variables?.planCode === p.code}
                  onClick={() => checkout.mutate({ planCode: p.code, period })}
                >
                  {isActive ? (
                    <>
                      <CheckCircle2 size={14} /> Paket aktif
                    </>
                  ) : price === 0 ? (
                    'Default'
                  ) : (
                    <>
                      <Sparkles size={14} /> Upgrade sekarang
                    </>
                  )}
                </Button>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {sub && (
        <Card>
          <CardHeader title="Pemakaian terhadap batas" subtitle="Berdasarkan paket aktif" />
          <CardBody>
            <div className="space-y-4">
              {plans
                .filter((p) => p.code === sub.planCode)
                .map((p) => (
                  <div key={p.id} className="space-y-2.5">
                    {[
                      { label: 'Akun Telegram', used: sub.usage.telegramAccounts, limit: p.limits.maxTelegramAccounts },
                      {
                        label: 'Campaign bersamaan',
                        used: sub.usage.concurrentCampaigns,
                        limit: p.limits.maxConcurrentCampaigns,
                      },
                      {
                        label: 'Broadcast hari ini',
                        used: sub.usage.broadcastsToday,
                        limit: p.limits.maxBroadcastsPerDay,
                      },
                      {
                        label: 'Discovery sources',
                        used: sub.usage.discoverySources,
                        limit: p.limits.maxDiscoverySources,
                      },
                    ].map((row) => {
                      const pct = Math.min(100, (row.used / Math.max(1, row.limit)) * 100);
                      return (
                        <div key={row.label}>
                          <div className="flex justify-between text-xs text-muted mb-1">
                            <span>{row.label}</span>
                            <span className="tabular">
                              {formatNumber(row.used)} / {formatNumber(row.limit)}
                            </span>
                          </div>
                          <Progress value={pct} tone={pct > 85 ? 'warn' : 'tg'} />
                        </div>
                      );
                    })}
                  </div>
                ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function featureLine(label: string, level: 'none' | 'limited' | 'basic' | 'full'): string {
  const tag =
    level === 'full' ? 'lengkap' : level === 'basic' ? 'dasar' : level === 'limited' ? 'terbatas' : 'tidak tersedia';
  return `${label} ${tag}`;
}

function UsagePill({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5">
      <p className="text-[11.5px] opacity-75">{label}</p>
      <p className="text-lg font-bold tabular leading-tight">{value}</p>
    </div>
  );
}

