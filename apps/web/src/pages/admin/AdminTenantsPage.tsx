import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';

import { Badge } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Kpi } from '../../components/ui/Kpi';
import { PageHeader } from '../../components/ui/PageHeader';
import { TBody, THead, Table, TMain, TSub } from '../../components/ui/Table';
import { apiFetch } from '../../lib/api';
import type { AdminTenantSummary } from '@eak/shared';

export function AdminTenantsPage(): JSX.Element {
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: () => apiFetch<AdminTenantSummary[]>('/admin/tenants'),
  });

  const totalMrr = data.reduce((s, t) => s + t.mrrIdr, 0);
  const activeCount = data.filter((t) => t.status === 'active').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Platform tenants" description="Overview seluruh tenant yang terdaftar di platform." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Total tenant" value={data.length} tone="violet" icon={<Building2 size={16} />} />
        <Kpi label="Active" value={activeCount} tone="ok" />
        <Kpi label="MRR total" value={`Rp ${totalMrr.toLocaleString('id-ID')}`} tone="tg" />
        <Kpi label="Suspended" value={data.filter((t) => t.status === 'suspended').length} tone="bad" />
      </div>

      <Card>
        <CardHeader title={`Tenants (${data.length})`} icon={<Building2 size={14} />} />
        <CardBody className="pt-0">
          {isLoading ? (
            <div className="skeleton h-[300px]" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <th>Tenant</th>
                  <th>Paket</th>
                  <th className="r">Member</th>
                  <th className="r">Akun</th>
                  <th className="r">MRR</th>
                  <th>Status</th>
                </tr>
              </THead>
              <TBody>
                {data.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <TMain>{t.name}</TMain>
                      <TSub>{t.slug}</TSub>
                    </td>
                    <td>
                      <Badge tone={t.planCode === 'business' ? 'violet' : t.planCode === 'pro' ? 'info' : 'default'} dot={false}>
                        {t.planCode}
                      </Badge>
                    </td>
                    <td className="r tabular">{t.memberCount}</td>
                    <td className="r tabular">{t.accountCount}</td>
                    <td className="r tabular font-semibold">Rp {t.mrrIdr.toLocaleString('id-ID')}</td>
                    <td>
                      <Badge tone={t.status === 'active' ? 'ok' : 'bad'}>{t.status}</Badge>
                    </td>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
