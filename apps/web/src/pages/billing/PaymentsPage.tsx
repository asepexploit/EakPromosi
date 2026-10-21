import type { Invoice } from '@eak/shared';
import { useQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react';

import { Badge } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Kpi } from '../../components/ui/Kpi';
import { PageHeader } from '../../components/ui/PageHeader';
import { TBody, THead, Table, TMain, TSub } from '../../components/ui/Table';
import { apiFetch } from '../../lib/api';
import { formatDateTime, formatIdr, formatNumber } from '../../lib/format';
import { INVOICE_STATUS } from '../../lib/statusLabels';

export function PaymentsPage(): JSX.Element {
  const { data = [], isLoading } = useQuery({
    queryKey: ['billing', 'history'],
    queryFn: () => apiFetch<Invoice[]>('/billing/history'),
    retry: false,
  });

  const paid = data.filter((i) => i.status === 'paid');
  const totalPaid = paid.reduce((a, i) => a + i.amount, 0);
  const pending = data.filter((i) => i.status === 'pending').length;
  const failed = data.filter((i) => i.status === 'failed' || i.status === 'expired').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment History"
        description="Semua invoice via Pakasir. Status transisi hanya pending → paid|failed|expired (idempotent)."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Total dibayar" value={formatIdr(totalPaid)} tone="ok" />
        <Kpi label="Invoice lunas" value={formatNumber(paid.length)} tone="tg" />
        <Kpi label="Menunggu" value={formatNumber(pending)} tone="warn" />
        <Kpi label="Gagal / expired" value={formatNumber(failed)} tone="bad" />
      </div>

      <Card>
        <CardHeader
          title={`Invoice (${data.length})`}
          subtitle="Diurutkan dari terbaru"
          icon={<Receipt size={14} />}
        />
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
                {data.map((i) => {
                  const meta = INVOICE_STATUS[i.status];
                  return (
                    <tr key={i.id}>
                      <td className="mono">{i.pakasirInvoiceId}</td>
                      <td>
                        <TMain>{i.planCode.toUpperCase()}</TMain>
                        <TSub>{i.period === 'monthly' ? 'bulanan' : 'tahunan'}</TSub>
                      </td>
                      <td className="r tabular font-semibold">{formatIdr(i.amount)}</td>
                      <td>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="text-xs text-muted tabular">{formatDateTime(i.createdAt)}</td>
                      <td className="text-xs text-muted tabular">{i.paidAt ? formatDateTime(i.paidAt) : '—'}</td>
                    </tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
