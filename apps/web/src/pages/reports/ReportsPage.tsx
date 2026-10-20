import { BarChart3 } from 'lucide-react';

import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';

export function ReportsPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistics & Reports"
        description="Agregat per periode, bersumber dari worker reports:aggregate."
      />
      <Card>
        <CardHeader title="Ringkasan" icon={<BarChart3 size={14} />} />
        <CardBody>
          <EmptyState
            icon={<BarChart3 size={24} />}
            title="Agregat belum tersedia"
            description="Agregat harian/mingguan akan muncul setelah worker reports:aggregate memproses minimal 1 periode."
          />
        </CardBody>
      </Card>
    </div>
  );
}
