import type { Plan } from '@eak/shared';
import { useQuery } from '@tanstack/react-query';
import { CreditCard } from 'lucide-react';

import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { TBody, THead, Table, TMain } from '../../components/ui/Table';
import { apiFetch } from '../../lib/api';

export function AdminPlansPage(): JSX.Element {
  const { data = [] } = useQuery({ queryKey: ['admin', 'plans'], queryFn: () => apiFetch<Plan[]>('/plans') });
  return (
    <div className="space-y-6">
      <PageHeader title="Plans" description="Konfigurasi paket: harga, limits, feature flags." />
      <Card>
        <CardHeader title={`Konfigurasi paket (${data.length})`} icon={<CreditCard size={14} />} />
        <CardBody className="pt-0">
          <Table>
            <THead>
              <tr>
                <th>Code</th>
                <th>Nama</th>
                <th className="r">Akun</th>
                <th className="r">Campaigns</th>
                <th className="r">Broadcast/day</th>
                <th className="r">Sources</th>
                <th className="r">Harga</th>
              </tr>
            </THead>
            <TBody>
              {data.map((p) => (
                <tr key={p.id}>
                  <td className="mono">{p.code}</td>
                  <td>
                    <TMain>{p.name}</TMain>
                  </td>
                  <td className="r tabular">{p.limits.maxTelegramAccounts}</td>
                  <td className="r tabular">{p.limits.maxConcurrentCampaigns}</td>
                  <td className="r tabular">{p.limits.maxBroadcastsPerDay}</td>
                  <td className="r tabular">{p.limits.maxDiscoverySources}</td>
                  <td className="r tabular font-semibold">Rp {p.prices.monthly.toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </TBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
