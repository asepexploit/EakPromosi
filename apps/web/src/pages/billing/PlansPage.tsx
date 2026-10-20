import { useMutation, useQuery } from '@tanstack/react-query';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { apiFetch } from '../../lib/api';
import type { CreateInvoiceResult, Plan, Subscription } from '@eak/shared';

function formatIdr(amount: number): string {
  return amount === 0 ? 'Gratis' : `Rp ${amount.toLocaleString('id-ID')}`;
}

export function PlansPage(): JSX.Element {
  const { data: plans = [] } = useQuery({ queryKey: ['plans'], queryFn: () => apiFetch<Plan[]>('/plans') });
  const { data: sub } = useQuery({ queryKey: ['subscriptions', 'current'], queryFn: () => apiFetch<Subscription>('/subscriptions/current') });
  const checkout = useMutation({
    mutationFn: (planCode: string) =>
      apiFetch<CreateInvoiceResult>('/billing/checkout', { method: 'POST', json: { planCode, period: 'monthly' } }),
    onSuccess: (res) => {
      window.location.href = res.redirectUrl;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Subscription & Plans</h1>
        <p className="text-xs text-muted">Subscription-only — tidak ada wallet/credit. Pembayaran via Pakasir.</p>
      </div>
      {sub && (
        <Card>
          <CardHeader title={`Paket aktif: ${sub.planCode.toUpperCase()}`} subtitle={sub.endsAt ? `Berakhir ${new Date(sub.endsAt).toLocaleDateString()}` : undefined} />
          <CardBody className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted">Akun Telegram</p>
              <p className="tabular font-medium">{sub.usage.telegramAccounts}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Campaign aktif</p>
              <p className="tabular font-medium">{sub.usage.concurrentCampaigns}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Broadcast hari ini</p>
              <p className="tabular font-medium">{sub.usage.broadcastsToday}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Discovery sources</p>
              <p className="tabular font-medium">{sub.usage.discoverySources}</p>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => (
          <Card key={p.id}>
            <CardHeader title={p.name} actions={<Badge tone="info">{p.code}</Badge>} />
            <CardBody className="space-y-3">
              <p className="text-2xl font-semibold tabular">{formatIdr(p.prices.monthly)}<span className="text-xs text-muted"> / bulan</span></p>
              <ul className="text-sm space-y-1 text-muted">
                <li>{p.limits.maxTelegramAccounts} akun Telegram</li>
                <li>{p.limits.maxConcurrentCampaigns} campaign bersamaan</li>
                <li>{p.limits.maxBroadcastsPerDay.toLocaleString('id-ID')} broadcast / hari</li>
                <li>{p.limits.maxDiscoverySources} discovery sources</li>
              </ul>
              <Button
                variant={sub?.planCode === p.code ? 'secondary' : 'primary'}
                className="w-full"
                disabled={sub?.planCode === p.code || checkout.isPending || p.prices.monthly === 0}
                onClick={() => checkout.mutate(p.code)}
              >
                {sub?.planCode === p.code ? 'Paket aktif' : p.prices.monthly === 0 ? 'Default' : 'Upgrade'}
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
