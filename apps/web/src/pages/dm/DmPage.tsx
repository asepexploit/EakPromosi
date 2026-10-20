import { useQuery } from '@tanstack/react-query';

import { Badge } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { apiFetch } from '../../lib/api';
import type { DmRule } from '@eak/shared';

export function DmPage(): JSX.Element {
  const { data = [] } = useQuery({
    queryKey: ['dm', 'rules'],
    queryFn: () => apiFetch<DmRule[]>('/dm/rules'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Auto-DM & Auto Reply</h1>
        <p className="text-xs text-muted">
          Trigger: keyword, DM baru, mention, atau user baru masuk grup. Jangan kirim DM massal tanpa opt-in.
        </p>
      </div>
      <Card>
        <CardHeader title={`Aturan (${data.length})`} />
        <CardBody>
          {data.length === 0 ? (
            <p className="text-sm text-muted">Belum ada aturan. Fitur ini butuh paket Pro atau lebih tinggi.</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.map((r) => (
                <li key={r.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{r.name}</p>
                    <p className="text-xs text-muted">{r.triggerType} · cooldown {r.cooldownMinutes} menit</p>
                  </div>
                  <Badge tone={r.isActive ? 'ok' : 'default'}>{r.isActive ? 'Aktif' : 'Off'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
