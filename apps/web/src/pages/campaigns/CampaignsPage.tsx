import { useQuery } from '@tanstack/react-query';
import { Calendar, Plus } from 'lucide-react';

import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Progress } from '../../components/ui/Progress';
import { apiFetch } from '../../lib/api';
import type { CampaignStatus, CampaignSummary } from '@eak/shared';

const STATUS_TONE: Record<CampaignStatus, BadgeTone> = {
  draft: 'default',
  scheduled: 'info',
  running: 'ok',
  paused: 'warn',
  completed: 'ok',
  failed: 'bad',
  archived: 'default',
};

export function CampaignsPage(): JSX.Element {
  const { data = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => apiFetch<CampaignSummary[]>('/campaigns'),
    refetchInterval: 15_000,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaign Management"
        description="Perencanaan promosi: jadwal, template, target. Eksekusi tetap lewat modul Broadcast (tidak duplikasi logika kirim)."
        actions={
          <Button variant="primary">
            <Plus size={14} /> Campaign Baru
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="skeleton h-[180px]" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Calendar size={24} />}
              title="Belum ada campaign"
              description="Buat campaign untuk menjadwalkan broadcast berulang ke target yang sama."
              action={
                <Button variant="primary">
                  <Plus size={14} /> Campaign Pertama
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((c) => {
            const pct = c.totalPlanned > 0 ? (c.sent / c.totalPlanned) * 100 : 0;
            return (
              <Card key={c.id} interactive>
                <CardHeader
                  title={c.name}
                  subtitle={`${c.targetCount} target · ${c.accountIds.length} akun`}
                  icon={<Calendar size={14} />}
                  actions={
                    <Badge tone={STATUS_TONE[c.status]} pulse={c.status === 'running'}>
                      {c.status}
                    </Badge>
                  }
                />
                <CardBody>
                  <div className="flex items-end gap-6 mb-3">
                    <div>
                      <p className="text-xs text-muted">Sent</p>
                      <p className="text-2xl font-bold tabular text-ok leading-none mt-1">{c.sent}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Failed</p>
                      <p className="text-2xl font-bold tabular text-bad leading-none mt-1">{c.failed}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs text-muted mb-1.5">
                        <span>Progress</span>
                        <span className="tabular">
                          {c.sent}/{c.totalPlanned}
                        </span>
                      </div>
                      <Progress value={pct} tone="tg" />
                    </div>
                  </div>
                  <p className="text-xs text-muted">
                    {new Date(c.startsAt).toLocaleDateString('id-ID')}
                    {c.endsAt ? ` → ${new Date(c.endsAt).toLocaleDateString('id-ID')}` : ' · open-ended'}
                  </p>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
