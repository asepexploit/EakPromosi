import { useQuery } from '@tanstack/react-query';

import { Badge } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { apiFetch } from '../../lib/api';
import type { AdminTenantSummary } from '@eak/shared';

export function AdminTenantsPage(): JSX.Element {
  const { data = [] } = useQuery({ queryKey: ['admin', 'tenants'], queryFn: () => apiFetch<AdminTenantSummary[]>('/admin/tenants') });
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Platform tenants</h1>
      <Card>
        <CardHeader title={`Tenants (${data.length})`} />
        <CardBody>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted border-b border-line">
              <tr>
                <th className="text-left py-2">Tenant</th>
                <th className="text-left">Paket</th>
                <th className="text-right">Member</th>
                <th className="text-right">Akun</th>
                <th className="text-right">MRR</th>
                <th className="text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.id} className="border-b border-line/60">
                  <td className="py-2">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted">{t.slug}</div>
                  </td>
                  <td>{t.planCode}</td>
                  <td className="text-right tabular">{t.memberCount}</td>
                  <td className="text-right tabular">{t.accountCount}</td>
                  <td className="text-right tabular">Rp {t.mrrIdr.toLocaleString('id-ID')}</td>
                  <td><Badge tone={t.status === 'active' ? 'ok' : 'bad'}>{t.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
