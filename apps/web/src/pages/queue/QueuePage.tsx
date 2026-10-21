import type { AuditLog, MonitoringSnapshot } from '@eak/shared';
import { useQuery } from '@tanstack/react-query';
import { ListTodo, Zap } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { TBody, THead, Table, TMain, TSub } from '../../components/ui/Table';
import { apiFetch } from '../../lib/api';
import { cn } from '../../lib/cn';
import { formatDateTime, formatNumber } from '../../lib/format';

const SEVERITY_LABEL: Record<AuditLog['severity'], { label: string; tone: 'default' | 'warn' | 'bad' }> = {
  info: { label: 'Info', tone: 'default' },
  warn: { label: 'Peringatan', tone: 'warn' },
  critical: { label: 'Kritis', tone: 'bad' },
};

export function QueuePage(): JSX.Element {
  const [tab, setTab] = useState<'queues' | 'audit'>('queues');

  const { data: snapshot } = useQuery({
    queryKey: ['monitoring', 'snapshot', 'queue-page'],
    queryFn: () => apiFetch<MonitoringSnapshot>('/monitoring/snapshot'),
    refetchInterval: 10_000,
    retry: false,
  });

  const { data: audit = [], isLoading: auditLoading } = useQuery({
    queryKey: ['audit', 'recent'],
    queryFn: () => apiFetch<AuditLog[]>('/audit', { query: { limit: 50 } }),
    enabled: tab === 'audit',
    retry: false,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task Queue & Activity Logs"
        description="Detail job BullMQ + audit log tindakan sensitif tenant."
      />

      <div className="flex gap-2 flex-wrap">
        <Chip active={tab === 'queues'} onClick={() => setTab('queues')}>
          <Zap size={13} /> Antrean worker
        </Chip>
        <Chip active={tab === 'audit'} onClick={() => setTab('audit')}>
          <ListTodo size={13} /> Audit log
        </Chip>
      </div>

      {tab === 'queues' && (
        <Card>
          <CardHeader
            title="Status antrean"
            subtitle="Diperbarui tiap 10 detik. Live push via WebSocket."
            icon={<Zap size={14} />}
            actions={
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Refresh
              </Button>
            }
          />
          <CardBody className="pt-0">
            {!snapshot ? (
              <div className="skeleton h-[260px]" />
            ) : snapshot.queues.length === 0 ? (
              <EmptyState title="Belum ada queue aktif" description="Worker belum terdaftar atau belum ada job." />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <th>Queue</th>
                    <th className="r">Waiting</th>
                    <th className="r">Active</th>
                    <th className="r">Delayed</th>
                    <th className="r">Completed 24h</th>
                    <th className="r">Failed</th>
                  </tr>
                </THead>
                <TBody>
                  {snapshot.queues.map((q) => (
                    <tr key={q.name}>
                      <td>
                        <TMain>{q.name}</TMain>
                        <TSub>{q.active > 0 ? 'ada job berjalan' : 'idle'}</TSub>
                      </td>
                      <td className="r tabular">{formatNumber(q.waiting)}</td>
                      <td className="r tabular text-ok font-semibold">{formatNumber(q.active)}</td>
                      <td className="r tabular">{formatNumber(q.delayed)}</td>
                      <td className="r tabular text-muted">{formatNumber(q.completed24h)}</td>
                      <td className={cn('r tabular font-semibold', q.failed > 0 ? 'text-bad' : 'text-muted')}>
                        {formatNumber(q.failed)}
                      </td>
                    </tr>
                  ))}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>
      )}

      {tab === 'audit' && (
        <Card>
          <CardHeader title={`Audit log (${audit.length})`} icon={<ListTodo size={14} />} />
          <CardBody className="pt-0">
            {auditLoading ? (
              <div className="skeleton h-[260px]" />
            ) : audit.length === 0 ? (
              <EmptyState
                icon={<ListTodo size={24} />}
                title="Belum ada audit"
                description="Audit log muncul saat ada mutasi sensitif (add account, change plan, delete session, dst)."
              />
            ) : (
              <ul className="divide-y divide-line">
                {audit.map((a) => {
                  const sev = SEVERITY_LABEL[a.severity];
                  return (
                    <li key={a.id} className="py-3">
                      <div className="flex justify-between gap-4 items-start">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-tg-ink bg-tg/10 px-2 py-0.5 rounded">
                              {a.action}
                            </span>
                            <Badge tone={sev.tone} dot={false}>
                              {sev.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted mt-1.5">
                            {a.actorEmail ?? 'system'} → {a.resource}
                            {a.resourceId ? ` #${a.resourceId}` : ''}
                          </p>
                        </div>
                        <span className="text-xs text-muted tabular whitespace-nowrap">
                          {formatDateTime(a.createdAt)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
