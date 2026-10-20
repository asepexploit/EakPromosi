import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Plus } from 'lucide-react';

import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { apiFetch } from '../../lib/api';
import type { DmRule } from '@eak/shared';

export function DmPage(): JSX.Element {
  const { data = [], isLoading } = useQuery({
    queryKey: ['dm', 'rules'],
    queryFn: () => apiFetch<DmRule[]>('/dm/rules'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auto-DM & Auto Reply"
        description="Balasan otomatis untuk DM / mention. Trigger: keyword, DM baru, mention, atau user baru masuk grup."
        actions={
          <Button variant="primary">
            <Plus size={14} /> Rule Baru
          </Button>
        }
      />

      <Alert
        tone="warn"
        title="Patuhi ToS Telegram"
        description="Dilarang kirim DM massal ke user yang belum pernah interaksi tanpa opt-in jelas. Cooldown per peer wajib."
      />

      <Card>
        <CardHeader title={`Aturan (${data.length})`} icon={<MessageCircle size={14} />} />
        <CardBody className="pt-0">
          {isLoading ? (
            <div className="skeleton h-[160px]" />
          ) : data.length === 0 ? (
            <EmptyState
              icon={<MessageCircle size={24} />}
              title="Belum ada aturan auto-reply"
              description="Fitur ini butuh paket Pro atau lebih tinggi."
            />
          ) : (
            <ul className="divide-y divide-line-soft">
              {data.map((r) => (
                <li key={r.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm">{r.name}</p>
                    <p className="text-xs text-muted">
                      {r.triggerType.replace('_', ' ')} · cooldown {r.cooldownMinutes} menit · {r.keywords.length} keyword
                    </p>
                  </div>
                  <Badge tone={r.isActive ? 'ok' : 'default'} pulse={r.isActive}>
                    {r.isActive ? 'Aktif' : 'Off'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
