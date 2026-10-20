import { useQuery } from '@tanstack/react-query';

import { Badge } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { apiFetch } from '../../lib/api';
import type { Invoice } from '@eak/shared';

export function PaymentsPage(): JSX.Element {
  const { data = [] } = useQuery({ queryKey: ['billing', 'history'], queryFn: () => apiFetch<Invoice[]>('/billing/history') });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Payment History</h1>
      <Card>
        <CardHeader title={`Invoice (${data.length})`} />
        <CardBody>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted border-b border-line">
              <tr>
                <th className="text-left py-2">Invoice</th>
                <th className="text-left">Paket</th>
                <th className="text-right">Jumlah</th>
                <th className="text-left">Status</th>
                <th className="text-left">Dibuat</th>
              </tr>
            </thead>
            <tbody>
              {data.map((i) => (
                <tr key={i.id} className="border-b border-line/60">
                  <td className="py-2 font-mono text-xs">{i.pakasirInvoiceId}</td>
                  <td>{i.planCode}</td>
                  <td className="text-right tabular">Rp {i.amount.toLocaleString('id-ID')}</td>
                  <td>
                    <Badge tone={i.status === 'paid' ? 'ok' : i.status === 'failed' || i.status === 'expired' ? 'bad' : 'info'}>
                      {i.status}
                    </Badge>
                  </td>
                  <td className="text-xs text-muted">{new Date(i.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && <p className="text-sm text-muted">Belum ada invoice.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
