import { useQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react';

import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { TBody, THead, Table, TMain, TSub } from '../../components/ui/Table';
import { apiFetch } from '../../lib/api';
import type { Invoice } from '@eak/shared';

const STATUS_TONE: Record<string, BadgeTone> = {
  paid: 'ok',
  pending: 'info',
  failed: 'bad',
  expired: 'bad',
};

export function PaymentsPage(): JSX.Element {
  const { data = [], isLoading } = useQuery({
    queryKey: ['billing', 'history'],
    queryFn: () => apiFetch<Invoice[]>('/billing/history'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment History"
        description="Semua invoice via Pakasir. Status transisi hanya pending → paid|failed|expired (idempotent)."
      />
      <Card>
        <CardHeader title={`Invoice (${data.length})`} icon={<Receipt size={14} />} />
        <CardBody className="pt-0">
          {isLoading ? (
            <div className="skeleton h-[200px]" />
          ) : data.length === 0 ? (
            <EmptyState
              icon={<Receipt size={24} />}
              title="Belum ada invoice"
              description="Invoice muncul saat Anda upgrade paket atau renewal otomatis dari Pakasir."
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <th>Invoice</th>
                  <th>Paket</th>
                  <th className="r">Jumlah</th>
                  <th>Status</th>
                  <th>Dibuat</th>
                  <th>Dibayar</th>
                </tr>
              </THead>
              <TBody>
                {data.map((i) => (
                  <tr key={i.id}>
                    <td className="mono">{i.pakasirInvoiceId}</td>
                    <td>
                      <TMain>{i.planCode.toUpperCase()}</TMain>
                      <TSub>{i.period}</TSub>
                    </td>
                    <td className="r tabular font-semibold">Rp {i.amount.toLocaleString('id-ID')}</td>
                    <td>
                      <Badge tone={STATUS_TONE[i.status] ?? 'default'}>{i.status}</Badge>
                    </td>
                    <td className="text-xs text-muted tabular">{new Date(i.createdAt).toLocaleString('id-ID')}</td>
                    <td className="text-xs text-muted tabular">
                      {i.paidAt ? new Date(i.paidAt).toLocaleString('id-ID') : '—'}
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
