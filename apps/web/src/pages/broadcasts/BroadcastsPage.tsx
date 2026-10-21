import type { BroadcastSummary, CreateBroadcast, Group, TelegramAccount } from '@eak/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, PauseCircle, PlayCircle, Plus, StopCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field, Input } from '../../components/ui/Input';
import { Kpi } from '../../components/ui/Kpi';
import { PageHeader } from '../../components/ui/PageHeader';
import { Progress } from '../../components/ui/Progress';
import { TBody, THead, Table, TMain, TSub } from '../../components/ui/Table';
import { apiFetch } from '../../lib/api';
import { useApiMutation } from '../../lib/mutation';
import { BROADCAST_STATUS } from '../../lib/statusLabels';

export function BroadcastsPage(): JSX.Element {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ['broadcasts'],
    queryFn: () => apiFetch<BroadcastSummary[]>('/broadcasts'),
    refetchInterval: 10_000,
  });

  const control = useApiMutation(
    ({ id, action }: { id: string; action: 'pause' | 'resume' | 'cancel' }) =>
      apiFetch<void>(`/broadcasts/${id}/${action}`, { method: 'POST' }),
    {
      successMessage: 'Status broadcast diperbarui.',
      onSuccess: () => void qc.invalidateQueries({ queryKey: ['broadcasts'] }),
    },
  );

  const totals = data.reduce(
    (acc, b) => {
      acc.targets += b.totalTargets;
      acc.sent += b.sentCount;
      acc.failed += b.failedCount;
      if (b.status === 'sending' || b.status === 'queued') acc.active += 1;
      return acc;
    },
    { targets: 0, sent: 0, failed: 0, active: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auto Broadcast"
        description="Mesin kirim pesan — hanya ke grup dengan allow_promotion=true. Jitter 20–60s antar pesan per akun."
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus size={14} /> Broadcast Baru
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Total targets" value={totals.targets} icon={<Megaphone size={16} />} tone="tg" />
        <Kpi label="Sent" value={totals.sent} tone="ok" />
        <Kpi label="Failed" value={totals.failed} tone="bad" />
        <Kpi label="Active" value={totals.active} tone="warn" icon={<PlayCircle size={16} />} />
      </div>

      <Card>
        <CardHeader title={`Broadcast terbaru (${data.length})`} icon={<Megaphone size={14} />} />
        <CardBody className="pt-0">
          {isLoading ? (
            <div className="skeleton h-[200px]" />
          ) : data.length === 0 ? (
            <EmptyState
              icon={<Megaphone size={24} />}
              title="Belum ada broadcast"
              description="Buat broadcast baru untuk kirim pesan ke grup yang mengizinkan promosi."
              action={
                <Button variant="primary" onClick={() => setOpen(true)}>
                  <Plus size={14} /> Broadcast Pertama
                </Button>
              }
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <th>Judul</th>
                  <th>Progress</th>
                  <th className="r">Sent</th>
                  <th className="r">Failed</th>
                  <th>Status</th>
                  <th />
                </tr>
              </THead>
              <TBody>
                {data.map((b) => {
                  const pct = b.totalTargets > 0 ? ((b.sentCount + b.failedCount) / b.totalTargets) * 100 : 0;
                  const canPause = b.status === 'sending' || b.status === 'queued';
                  const canResume = b.status === 'paused';
                  const canCancel = canPause || canResume;
                  return (
                    <tr key={b.id}>
                      <td>
                        <TMain>{b.title}</TMain>
                        <TSub>{new Date(b.createdAt).toLocaleString('id-ID')}</TSub>
                      </td>
                      <td>
                        <div className="min-w-[160px]">
                          <Progress value={pct} tone={b.failedCount > 0 ? 'warn' : 'tg'} />
                          <p className="text-[11px] text-muted mt-1 tabular">
                            {b.sentCount + b.failedCount}/{b.totalTargets}
                          </p>
                        </div>
                      </td>
                      <td className="r tabular text-ok font-semibold">{b.sentCount}</td>
                      <td className="r tabular text-bad font-semibold">{b.failedCount}</td>
                      <td>
                        <Badge tone={BROADCAST_STATUS[b.status].tone} pulse={b.status === 'sending'}>
                          {BROADCAST_STATUS[b.status].label}
                        </Badge>
                      </td>
                      <td className="r">
                        <div className="inline-flex gap-1">
                          {canPause && (
                            <Button variant="ghost" size="xs" iconOnly aria-label="Pause" onClick={() => control.mutate({ id: b.id, action: 'pause' })}>
                              <PauseCircle size={14} />
                            </Button>
                          )}
                          {canResume && (
                            <Button variant="ghost" size="xs" iconOnly aria-label="Resume" onClick={() => control.mutate({ id: b.id, action: 'resume' })}>
                              <PlayCircle size={14} />
                            </Button>
                          )}
                          {canCancel && (
                            <Button variant="ghost" size="xs" iconOnly aria-label="Cancel" onClick={() => control.mutate({ id: b.id, action: 'cancel' })}>
                              <StopCircle size={14} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <BroadcastBuilder open={open} onOpenChange={setOpen} />
    </div>
  );
}

function BroadcastBuilder({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }): JSX.Element {
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

  const [form, setForm] = useState<CreateBroadcast>({
    accountId: '',
    templateId: null,
    title: '',
    body: '',
    mediaUrl: null,
    mediaKind: null,
    targetGroupIds: [],
    scheduledAt: null,
    minDelaySec: 20,
    maxDelaySec: 60,
  });

  const create = useApiMutation(
    (body: CreateBroadcast) =>
      apiFetch<{ id: string; status: string; totalTargets: number }>('/broadcasts', { method: 'POST', json: body }),
    {
      successMessage: 'Broadcast dibuat & dijadwalkan.',
      onSuccess: () => {
        onOpenChange(false);
        setForm({
          accountId: '',
          templateId: null,
          title: '',
          body: '',
          mediaUrl: null,
          mediaKind: null,
          targetGroupIds: [],
          scheduledAt: null,
          minDelaySec: 20,
          maxDelaySec: 60,
        });
        void qc.invalidateQueries({ queryKey: ['broadcasts'] });
      },
    },
  );

  const eligibleAccounts = useMemo(() => accounts.filter((a) => a.status === 'active'), [accounts]);

  const toggleTarget = (id: string): void => {
    setForm((prev) => ({
      ...prev,
      targetGroupIds: prev.targetGroupIds.includes(id)
        ? prev.targetGroupIds.filter((x) => x !== id)
        : [...prev.targetGroupIds, id],
    }));
  };
  const selectAll = (): void => setForm((f) => ({ ...f, targetGroupIds: groups.map((g) => g.id) }));
  const clearAll = (): void => setForm((f) => ({ ...f, targetGroupIds: [] }));

  const canSubmit = form.accountId && form.title && form.body && form.targetGroupIds.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Broadcast Baru"
      description="Pilih akun pengirim, tulis pesan, pilih grup target. Hanya grup dengan allow_promotion=true yang muncul."
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button variant="primary" disabled={!canSubmit} loading={create.isPending} onClick={() => create.mutate(form)}>
            Kirim sekarang ({form.targetGroupIds.length})
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-5">
        <div className="space-y-3.5">
          <Field label="Judul (internal)">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Promo Senin pagi" />
          </Field>
          <Field label="Akun pengirim">
            <select
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
              className="h-9 w-full rounded-lg border border-line bg-bg px-3 text-[13.5px] outline-none focus:border-tg focus:shadow-focus-tg"
            >
              <option value="">— Pilih akun aktif —</option>
              {eligibleAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.displayName} ({a.phoneMasked})
                </option>
              ))}
            </select>
            {eligibleAccounts.length === 0 && (
              <p className="text-xs text-warn mt-1">Belum ada akun aktif. Login akun di menu Accounts dulu.</p>
            )}
          </Field>
          <Field label="Isi pesan">
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={8}
              className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-[13.5px] leading-relaxed outline-none focus:border-tg focus:shadow-focus-tg resize-y font-mono"
              placeholder="Halo semua, promo spesial…"
              maxLength={4000}
            />
            <p className="text-xs text-muted mt-1">{form.body.length}/4000 karakter.</p>
          </Field>
          <Field label="Media URL (opsional)">
            <Input
              value={form.mediaUrl ?? ''}
              onChange={(e) => setForm({ ...form, mediaUrl: e.target.value || null })}
              placeholder="https://…"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min delay (detik)">
              <Input
                type="number"
                min={5}
                max={600}
                value={form.minDelaySec}
                onChange={(e) => setForm({ ...form, minDelaySec: Number(e.target.value) || 20 })}
              />
            </Field>
            <Field label="Max delay (detik)">
              <Input
                type="number"
                min={5}
                max={600}
                value={form.maxDelaySec}
                onChange={(e) => setForm({ ...form, maxDelaySec: Number(e.target.value) || 60 })}
              />
            </Field>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Target grup ({form.targetGroupIds.length}/{groups.length})</p>
            <div className="flex gap-1">
              <Button variant="ghost" size="xs" onClick={selectAll} disabled={groups.length === 0}>
                Pilih semua
              </Button>
              <Button variant="ghost" size="xs" onClick={clearAll} disabled={form.targetGroupIds.length === 0}>
                Clear
              </Button>
            </div>
          </div>
          <div className="border border-line rounded-lg max-h-[380px] overflow-y-auto scrollbar-thin">
            {groups.length === 0 ? (
              <p className="text-xs text-muted p-4">Belum ada grup dengan allow_promotion=true.</p>
            ) : (
              <ul>
                {groups.map((g) => {
                  const checked = form.targetGroupIds.includes(g.id);
                  return (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => toggleTarget(g.id)}
                        className="w-full text-left px-3 py-2 border-b border-line last:border-0 hover:bg-sunk flex items-center gap-2.5"
                      >
                        <span
                          className={`w-4 h-4 rounded border-[1.5px] grid place-items-center flex-none ${
                            checked ? 'bg-tg border-tg' : 'border-muted/60'
                          }`}
                        >
                          {checked && <span className="w-2 h-2 rounded-sm bg-white" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium truncate">{g.title}</span>
                          <span className="block text-[11px] text-muted truncate">
                            {g.username ? `@${g.username}` : g.telegramChatId}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
