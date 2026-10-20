import { useQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react';

import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { TBody, THead, Table } from '../../components/ui/Table';
import { apiFetch } from '../../lib/api';

interface AdminInvoiceRow {
  id: string;
  tenantSlug: string;
  planCode: string;
  amountIdr: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
}

const STATUS_TONE: Record<string, BadgeTone> = {
  paid: 'ok',
  pending: 'info',
  failed: 'bad',
  expired: 'bad',
};

export function AdminInvoicesPage(): JSX.Element {
  const { data = [] } = useQuery({ queryKey: ['admin', 'invoices'], queryFn: () => apiFetch<AdminInvoiceRow[]>('/admin/invoices') });
  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Semua invoice platform-wide (Pakasir)." />
      <Card>
        <CardHeader title={`Invoice (${data.length})`} icon={<Receipt size={14} />} />
        <CardBody className="pt-0">
          <Table>
            <THead>
              <tr>
                <th>Tenant</th>
                <th>Paket</th>
                <th className="r">Jumlah</th>
                <th>Status</th>
                <th>Dibayar</th>
              </tr>
            </THead>
            <TBody>
              {data.map((i) => (
                <tr key={i.id}>
                  <td className="mono">{i.tenantSlug}</td>
                  <td>{i.planCode}</td>
                  <td className="r tabular font-semibold">Rp {i.amountIdr.toLocaleString('id-ID')}</td>
                  <td>
                    <Badge tone={STATUS_TONE[i.status] ?? 'default'}>{i.status}</Badge>
                  </td>
                  <td className="text-xs text-muted tabular">{i.paidAt ? new Date(i.paidAt).toLocaleString('id-ID') : '—'}</td>
                </tr>
              ))}
            </TBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
