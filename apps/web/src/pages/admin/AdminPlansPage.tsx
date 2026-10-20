import { useQuery } from '@tanstack/react-query';

import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { apiFetch } from '../../lib/api';
import type { Plan } from '@eak/shared';

export function AdminPlansPage(): JSX.Element {
  const { data = [] } = useQuery({ queryKey: ['admin', 'plans'], queryFn: () => apiFetch<Plan[]>('/plans') });
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Plans</h1>
      <Card>
        <CardHeader title={`Konfigurasi paket (${data.length})`} subtitle="Edit limits & feature flags per paket" />
        <CardBody>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted border-b border-line">
              <tr>
                <th className="text-left py-2">Code</th>
                <th className="text-left">Nama</th>
                <th className="text-right">Akun</th>
                <th className="text-right">Campaigns</th>
                <th className="text-right">Broadcast/day</th>
                <th className="text-right">Harga</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id} className="border-b border-line/60">
                  <td className="py-2 font-mono text-xs">{p.code}</td>
                  <td>{p.name}</td>
                  <td className="text-right tabular">{p.limits.maxTelegramAccounts}</td>
                  <td className="text-right tabular">{p.limits.maxConcurrentCampaigns}</td>
                  <td className="text-right tabular">{p.limits.maxBroadcastsPerDay}</td>
                  <td className="text-right tabular">Rp {p.prices.monthly.toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
