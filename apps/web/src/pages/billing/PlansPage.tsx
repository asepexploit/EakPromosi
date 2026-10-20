import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Sparkles } from 'lucide-react';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Kpi } from '../../components/ui/Kpi';
import { PageHeader } from '../../components/ui/PageHeader';
import { Progress } from '../../components/ui/Progress';
import { apiFetch } from '../../lib/api';
import { cn } from '../../lib/cn';
import type { CreateInvoiceResult, Plan, Subscription } from '@eak/shared';

function formatIdr(amount: number): string {
  return amount === 0 ? 'Gratis' : `Rp ${amount.toLocaleString('id-ID')}`;
}

export function PlansPage(): JSX.Element {
  const { data: plans = [] } = useQuery({ queryKey: ['plans'], queryFn: () => apiFetch<Plan[]>('/plans') });
  const { data: sub } = useQuery({
    queryKey: ['subscriptions', 'current'],
    queryFn: () => apiFetch<Subscription>('/subscriptions/current'),
  });
  const checkout = useMutation({
    mutationFn: (planCode: string) =>
      apiFetch<CreateInvoiceResult>('/billing/checkout', { method: 'POST', json: { planCode, period: 'monthly' } }),
    onSuccess: (res) => {
      window.location.href = res.redirectUrl;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription & Plans"
        description="Subscription-only — tidak ada wallet/credit. Pembayaran via Pakasir dengan aktivasi otomatis saat webhook paid."
      />

      {sub && (
        <Card>
          <CardHeader
            title={`Paket aktif: ${sub.planCode.toUpperCase()}`}
            {...(sub.endsAt
              ? { subtitle: `Berakhir ${new Date(sub.endsAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` }
              : {})}
            icon={<Sparkles size={14} />}
            actions={<Badge tone={sub.status === 'active' ? 'ok' : 'warn'}>{sub.status}</Badge>}
          />
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="Akun Telegram" value={sub.usage.telegramAccounts} tone="tg" />
              <Kpi label="Campaign aktif" value={sub.usage.concurrentCampaigns} tone="violet" />
              <Kpi label="Broadcast hari ini" value={sub.usage.broadcastsToday} tone="ok" />
              <Kpi label="Discovery sources" value={sub.usage.discoverySources} tone="warn" />
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const isActive = sub?.planCode === p.code;
          const isPopular = p.code === 'pro';
          return (
            <Card
              key={p.id}
              interactive
              className={cn(isActive && 'ring-2 ring-tg border-tg', isPopular && !isActive && 'border-tg/30')}
            >
              <CardHeader
                title={p.name}
                actions={
                  <div className="flex gap-1.5">
                    {isPopular && !isActive && <Badge tone="violet" dot={false}>Populer</Badge>}
                    {isActive && <Badge tone="ok">Aktif</Badge>}
                  </div>
                }
              />
              <CardBody className="space-y-4">
                <div>
                  <p className="text-3xl font-bold tabular tracking-tight">{formatIdr(p.prices.monthly)}</p>
                  <p className="text-xs text-muted mt-0.5">per bulan</p>
                </div>

                <ul className="space-y-2 text-sm">
                  {[
                    `${p.limits.maxTelegramAccounts} akun Telegram`,
                    `${p.limits.maxConcurrentCampaigns} campaign bersamaan`,
                    `${p.limits.maxBroadcastsPerDay.toLocaleString('id-ID')} broadcast / hari`,
                    `${p.limits.maxDiscoverySources} discovery sources`,
                    p.features.autoDiscovery === 'full' ? 'Auto Discovery lengkap' : 'Auto Discovery dasar',
                    p.features.autoBroadcast === 'full' ? 'Campaign Management lengkap' : 'Campaign Management dasar',
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
                  disabled={isActive || checkout.isPending || p.prices.monthly === 0}
                  loading={checkout.isPending}
                  onClick={() => checkout.mutate(p.code)}
                >
                  {isActive ? 'Paket aktif' : p.prices.monthly === 0 ? 'Default' : 'Upgrade sekarang'}
                </Button>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
