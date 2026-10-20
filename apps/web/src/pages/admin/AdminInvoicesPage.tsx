import { useQuery } from '@tanstack/react-query';

import { Badge } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
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

export function AdminInvoicesPage(): JSX.Element {
  const { data = [] } = useQuery({ queryKey: ['admin', 'invoices'], queryFn: () => apiFetch<AdminInvoiceRow[]>('/admin/invoices') });
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Invoices</h1>
      <Card>
        <CardHeader title={`Invoice (${data.length})`} />
        <CardBody>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted border-b border-line">
              <tr>
                <th className="text-left py-2">Tenant</th>
                <th className="text-left">Paket</th>
                <th className="text-right">Jumlah</th>
                <th className="text-left">Status</th>
                <th className="text-left">Dibayar</th>
              </tr>
            </thead>
            <tbody>
              {data.map((i) => (
                <tr key={i.id} className="border-b border-line/60">
                  <td className="py-2 font-mono text-xs">{i.tenantSlug}</td>
                  <td>{i.planCode}</td>
                  <td className="text-right tabular">Rp {i.amountIdr.toLocaleString('id-ID')}</td>
                  <td><Badge tone={i.status === 'paid' ? 'ok' : i.status === 'pending' ? 'info' : 'bad'}>{i.status}</Badge></td>
                  <td className="text-xs text-muted">{i.paidAt ? new Date(i.paidAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
