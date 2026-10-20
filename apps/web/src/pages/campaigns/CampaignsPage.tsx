import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Calendar, PauseCircle, PlayCircle, Plus, StopCircle } from 'lucide-react';
import { useState } from 'react';

import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field, Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Progress } from '../../components/ui/Progress';
import { apiFetch } from '../../lib/api';
import { useApiMutation } from '../../lib/mutation';
import type { CampaignStatus, CampaignSummary, Group, TelegramAccount } from '@eak/shared';

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
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => apiFetch<CampaignSummary[]>('/campaigns'),
    refetchInterval: 15_000,
  });

  const control = useApiMutation(
    ({ id, action }: { id: string; action: 'start' | 'pause' | 'resume' | 'stop' | 'archive' }) =>
      apiFetch<void>(`/campaigns/${id}/${action}`, { method: 'POST' }),
    {
      successMessage: 'Status campaign diperbarui.',
      onSuccess: () => void qc.invalidateQueries({ queryKey: ['campaigns'] }),
    },
  );

  const handleArchive = async (c: CampaignSummary): Promise<void> => {
    const ok = await confirm.confirm({
      title: `Archive "${c.name}"?`,
      description: 'Campaign tidak akan dijalankan lagi; data tetap tersimpan untuk audit.',
      tone: 'danger',
      confirmLabel: 'Archive',
    });
    if (ok) control.mutate({ id: c.id, action: 'archive' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaign Management"
        description="Perencanaan promosi: jadwal, template, target. Eksekusi tetap lewat modul Broadcast."
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus size={14} /> Campaign Baru
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="skeleton h-[200px]" />
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
                <Button variant="primary" onClick={() => setOpen(true)}>
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
            const isTerminal = c.status === 'completed' || c.status === 'archived' || c.status === 'failed';
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
                  <p className="text-xs text-muted mb-3">
                    {new Date(c.startsAt).toLocaleDateString('id-ID')}
                    {c.endsAt ? ` → ${new Date(c.endsAt).toLocaleDateString('id-ID')}` : ' · open-ended'}
                  </p>
                  {!isTerminal && (
                    <div className="flex gap-1.5 flex-wrap">
                      {c.status === 'draft' && (
                        <Button variant="primary" size="sm" onClick={() => control.mutate({ id: c.id, action: 'start' })}>
                          <PlayCircle size={13} /> Mulai
                        </Button>
                      )}
                      {(c.status === 'running' || c.status === 'scheduled') && (
                        <Button variant="outline" size="sm" onClick={() => control.mutate({ id: c.id, action: 'pause' })}>
                          <PauseCircle size={13} /> Pause
                        </Button>
                      )}
                      {c.status === 'paused' && (
                        <Button variant="primary" size="sm" onClick={() => control.mutate({ id: c.id, action: 'resume' })}>
                          <PlayCircle size={13} /> Resume
                        </Button>
                      )}
                      <Button variant="danger" size="sm" onClick={() => control.mutate({ id: c.id, action: 'stop' })}>
                        <StopCircle size={13} /> Stop
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleArchive(c)}>
                        <Archive size={13} /> Archive
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <CampaignBuilder open={open} onOpenChange={setOpen} />
    </div>
  );
}

function CampaignBuilder({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }): JSX.Element {
  const qc = useQueryClient();
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiFetch<TelegramAccount[]>('/accounts'),
    enabled: open,
  });
  const { data: groups = [] } = useQuery({
    queryKey: ['groups', 'allow-promotion'],
    queryFn: () => apiFetch<Group[]>('/groups', { query: { allowPromotion: true, limit: 100 } }),
    enabled: open,
  });

  const [form, setForm] = useState({
    name: '',
    description: '' as string,
    startsAt: '' as string,
    endsAt: '' as string,
    accountIds: [] as string[],
    targetGroupIds: [] as string[],
    cron: '0 10 * * *',
  });

  const create = useApiMutation(
    () =>
      apiFetch<CampaignSummary>('/campaigns', {
        method: 'POST',
        json: {
          name: form.name,
          description: form.description || null,
          startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
          templateId: null,
          accountIds: form.accountIds,
          targetGroupIds: form.targetGroupIds,
          schedules: form.cron ? [{ cron: form.cron, timezone: 'Asia/Jakarta' }] : [],
        },
      }),
    {
      successMessage: 'Campaign dibuat (status: draft).',
      onSuccess: () => {
        onOpenChange(false);
        setForm({ name: '', description: '', startsAt: '', endsAt: '', accountIds: [], targetGroupIds: [], cron: '0 10 * * *' });
        void qc.invalidateQueries({ queryKey: ['campaigns'] });
      },
    },
  );

  const toggleAccount = (id: string): void =>
    setForm((f) => ({
      ...f,
      accountIds: f.accountIds.includes(id) ? f.accountIds.filter((x) => x !== id) : [...f.accountIds, id],
    }));
  const toggleGroup = (id: string): void =>
    setForm((f) => ({
      ...f,
      targetGroupIds: f.targetGroupIds.includes(id) ? f.targetGroupIds.filter((x) => x !== id) : [...f.targetGroupIds, id],
    }));

  const canSubmit = form.name && form.accountIds.length > 0 && form.targetGroupIds.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Campaign Baru"
      description="Campaign hanya merencanakan — eksekusi lewat Broadcast. Jadwal cron opsional."
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button variant="primary" disabled={!canSubmit} loading={create.isPending} onClick={() => create.mutate()}>
            Simpan Draft
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Nama campaign">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Cron jadwal" hint="Default: setiap jam 10 pagi.">
            <Input value={form.cron} onChange={(e) => setForm({ ...form, cron: e.target.value })} placeholder="0 10 * * *" />
          </Field>
        </div>
        <Field label="Deskripsi (opsional)">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-[13.5px] outline-none focus:border-tg focus:shadow-focus-tg resize-y"
          />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Mulai">
            <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
          </Field>
          <Field label="Selesai">
            <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Picker
            title={`Akun pengirim (${form.accountIds.length}/${accounts.length})`}
            items={accounts.map((a) => ({ id: a.id, main: a.displayName, sub: a.phoneMasked }))}
            selected={form.accountIds}
            onToggle={toggleAccount}
          />
          <Picker
            title={`Grup target (${form.targetGroupIds.length}/${groups.length})`}
            items={groups.map((g) => ({ id: g.id, main: g.title, sub: g.username ? `@${g.username}` : g.telegramChatId }))}
            selected={form.targetGroupIds}
            onToggle={toggleGroup}
          />
        </div>
      </div>
    </Dialog>
  );
}

interface PickerItem {
  id: string;
  main: string;
  sub: string;
}

function Picker({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: PickerItem[];
  selected: string[];
  onToggle: (id: string) => void;
}): JSX.Element {
  return (
    <div>
      <p className="text-sm font-semibold mb-1.5">{title}</p>
      <div className="border border-line rounded-lg max-h-[220px] overflow-y-auto scrollbar-thin">
        {items.length === 0 ? (
          <p className="text-xs text-muted p-3">Belum ada data.</p>
        ) : (
          <ul>
            {items.map((it) => {
              const checked = selected.includes(it.id);
              return (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => onToggle(it.id)}
                    className="w-full text-left px-3 py-2 border-b border-line-soft last:border-0 hover:bg-sunk flex items-center gap-2.5"
                  >
                    <span
                      className={`w-4 h-4 rounded border-[1.5px] grid place-items-center flex-none ${checked ? 'bg-tg border-tg' : 'border-muted/60'}`}
                    >
                      {checked && <span className="w-2 h-2 rounded-sm bg-white" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium truncate">{it.main}</span>
                      <span className="block text-[11px] text-muted truncate">{it.sub}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
