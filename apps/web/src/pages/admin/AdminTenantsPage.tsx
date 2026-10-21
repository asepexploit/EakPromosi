import type { AdminTenantSummary } from '@eak/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Pause, PlayCircle } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';
import { Field, Input } from '../../components/ui/Input';
import { Kpi } from '../../components/ui/Kpi';
import { PageHeader } from '../../components/ui/PageHeader';
import { TBody, THead, Table, TMain, TSub } from '../../components/ui/Table';
import { apiFetch } from '../../lib/api';
import { useApiMutation } from '../../lib/mutation';

export function AdminTenantsPage(): JSX.Element {
  const qc = useQueryClient();
  const [suspendTarget, setSuspendTarget] = useState<AdminTenantSummary | null>(null);
  const [reason, setReason] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: () => apiFetch<AdminTenantSummary[]>('/admin/tenants'),
  });

  const suspend = useApiMutation(
    ({ id, reason: r }: { id: string; reason: string }) =>
      apiFetch<void>(`/admin/tenants/${id}/suspend`, { method: 'POST', json: { reason: r } }),
    {
      successMessage: 'Tenant di-suspend.',
      onSuccess: () => {
        setSuspendTarget(null);
        setReason('');
        void qc.invalidateQueries({ queryKey: ['admin', 'tenants'] });
      },
    },
  );
  const activate = useApiMutation(
    (id: string) => apiFetch<void>(`/admin/tenants/${id}/activate`, { method: 'POST' }),
    {
      successMessage: 'Tenant diaktifkan kembali.',
      onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'tenants'] }),
    },
  );

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
                  <th />
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
                    <td className="r">
                      {t.status === 'active' ? (
                        <Button variant="danger" size="xs" onClick={() => setSuspendTarget(t)}>
                          <Pause size={12} /> Suspend
                        </Button>
                      ) : (
                        <Button variant="outline" size="xs" onClick={() => activate.mutate(t.id)} loading={activate.isPending}>
                          <PlayCircle size={12} /> Activate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Dialog
        open={!!suspendTarget}
        onOpenChange={(open) => {
          if (!open) {
            setSuspendTarget(null);
            setReason('');
          }
        }}
        title={`Suspend ${suspendTarget?.name ?? ''}?`}
        description="Semua akun tenant akan dihentikan, operasi menjadi read-only sampai di-activate kembali."
        footer={
          <>
            <Button variant="ghost" onClick={() => setSuspendTarget(null)}>Batal</Button>
            <Button
              variant="danger-solid"
              disabled={reason.length < 5}
              loading={suspend.isPending}
              onClick={() => suspendTarget && suspend.mutate({ id: suspendTarget.id, reason })}
            >
              Suspend
            </Button>
          </>
        }
      >
        <Field label="Alasan suspend" hint="Minimum 5 karakter, dicatat di audit log.">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </Field>
      </Dialog>
    </div>
  );
}
