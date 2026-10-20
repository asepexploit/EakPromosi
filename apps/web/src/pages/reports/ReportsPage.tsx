import { Card, CardBody, CardHeader } from '../../components/ui/Card';

export function ReportsPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Statistics & Reports</h1>
        <p className="text-xs text-muted">Agregat per periode, bersumber dari worker <code>reports:aggregate</code>.</p>
      </div>
      <Card>
        <CardHeader title="Ringkasan" />
        <CardBody className="text-sm text-muted">
          Agregat harian/mingguan tersedia setelah worker reports:aggregate aktif (lihat .claude/rules/queue.md).
        </CardBody>
      </Card>
    </div>
  );
}
