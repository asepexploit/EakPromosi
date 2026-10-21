import type { DmRule, UpsertDmRule } from '@eak/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field, Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Switch } from '../../components/ui/Switch';
import { apiFetch } from '../../lib/api';
import { useApiMutation } from '../../lib/mutation';

export function DmPage(): JSX.Element {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ['dm', 'rules'],
    queryFn: () => apiFetch<DmRule[]>('/dm/rules'),
  });

  const remove = useApiMutation(
    (id: string) => apiFetch<void>(`/dm/rules/${id}`, { method: 'DELETE' }),
    {
      successMessage: 'Rule dihapus.',
      onSuccess: () => void qc.invalidateQueries({ queryKey: ['dm', 'rules'] }),
    },
  );

  const handleDelete = async (r: DmRule): Promise<void> => {
    const ok = await confirm.confirm({
      title: `Hapus rule "${r.name}"?`,
      tone: 'danger',
      confirmLabel: 'Hapus',
    });
    if (ok) remove.mutate(r.id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auto-DM & Auto Reply"
        description="Balasan otomatis untuk DM / mention. Trigger: keyword, DM baru, mention, atau user baru masuk grup."
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
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
              action={
                <Button variant="primary" onClick={() => setOpen(true)}>
                  <Plus size={14} /> Rule Pertama
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {data.map((r) => (
                <li key={r.id} className="py-3 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm">{r.name}</p>
                    <p className="text-xs text-muted">
                      {r.triggerType.replace('_', ' ')} · cooldown {r.cooldownMinutes} menit · {r.keywords.length} keyword
                    </p>
                    {r.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {r.keywords.slice(0, 6).map((kw) => (
                          <span key={kw} className="text-[11px] font-mono bg-sunk text-fg px-1.5 py-0.5 rounded border border-line">
                            {kw}
                          </span>
                        ))}
                        {r.keywords.length > 6 && <span className="text-[11px] text-muted">+{r.keywords.length - 6}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={r.isActive ? 'ok' : 'default'} pulse={r.isActive}>
                      {r.isActive ? 'Aktif' : 'Off'}
                    </Badge>
                    <Button variant="ghost" size="sm" iconOnly onClick={() => handleDelete(r)} aria-label="Hapus rule">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <RuleDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function RuleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }): JSX.Element {
  const qc = useQueryClient();
  const [form, setForm] = useState<UpsertDmRule>({
    name: '',
    triggerType: 'new_dm',
    keywords: [],
    responseType: 'template_text',
    responseBody: '',
    responseMedia: null,
    cooldownMinutes: 60,
    activeHoursStart: null,
    activeHoursEnd: null,
    timezone: 'Asia/Jakarta',
    isActive: true,
  });
  const [keywordInput, setKeywordInput] = useState('');

  const create = useApiMutation(
    (body: UpsertDmRule) => apiFetch<DmRule>('/dm/rules', { method: 'POST', json: body }),
    {
      successMessage: 'Rule disimpan.',
      onSuccess: () => {
        onOpenChange(false);
        void qc.invalidateQueries({ queryKey: ['dm', 'rules'] });
      },
    },
  );

  const addKeyword = (): void => {
    const kw = keywordInput.trim();
    if (!kw) return;
    if (form.keywords.includes(kw)) return;
    setForm({ ...form, keywords: [...form.keywords, kw] });
    setKeywordInput('');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Buat DM / Reply Rule"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            variant="primary"
            disabled={!form.name || (form.triggerType === 'keyword_match' && form.keywords.length === 0)}
            loading={create.isPending}
            onClick={() => create.mutate(form)}
          >
            Simpan
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <Field label="Nama rule">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Welcome DM" autoFocus />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Field label="Trigger">
            <select
              value={form.triggerType}
              onChange={(e) =>
                setForm({
                  ...form,
                  triggerType: e.target.value as UpsertDmRule['triggerType'],
                })
              }
              className="h-9 w-full rounded-lg border border-line bg-bg px-3 text-[13.5px] outline-none focus:border-tg focus:shadow-focus-tg"
            >
              <option value="new_dm">New DM</option>
              <option value="keyword_match">Keyword match</option>
              <option value="mention">Mention</option>
              <option value="group_join_event">Group join event</option>
            </select>
          </Field>
          <Field label="Tipe respons">
            <select
              value={form.responseType}
              onChange={(e) =>
                setForm({
                  ...form,
                  responseType: e.target.value as UpsertDmRule['responseType'],
                })
              }
              className="h-9 w-full rounded-lg border border-line bg-bg px-3 text-[13.5px] outline-none focus:border-tg focus:shadow-focus-tg"
            >
              <option value="template_text">Template text</option>
              <option value="template_media">Template media</option>
              <option value="tag_only">Tag only (no send)</option>
              <option value="forward_to_bot">Forward ke bot</option>
            </select>
          </Field>
        </div>
        {form.triggerType === 'keyword_match' && (
          <Field label="Keywords" hint="Tekan Enter untuk tambah. Minimal 1.">
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addKeyword();
                  }
                }}
                placeholder="promo"
              />
              <Button variant="outline" onClick={addKeyword} type="button">
                Tambah
              </Button>
            </div>
            {form.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.keywords.map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => setForm({ ...form, keywords: form.keywords.filter((x) => x !== kw) })}
                    className="text-[11px] font-mono bg-sunk hover:bg-bad/10 hover:text-bad text-fg px-1.5 py-0.5 rounded border border-line transition-colors"
                  >
                    {kw} ×
                  </button>
                ))}
              </div>
            )}
          </Field>
        )}
        <Field label="Isi respons">
          <textarea
            value={form.responseBody ?? ''}
            onChange={(e) => setForm({ ...form, responseBody: e.target.value })}
            rows={4}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-[13.5px] leading-relaxed outline-none focus:border-tg focus:shadow-focus-tg resize-y"
            placeholder="Halo! Terima kasih sudah DM, admin akan segera balas."
          />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Field label="Cooldown per peer (menit)">
            <Input
              type="number"
              min={1}
              value={form.cooldownMinutes}
              onChange={(e) => setForm({ ...form, cooldownMinutes: Number(e.target.value) || 60 })}
            />
          </Field>
          <Field label="Timezone">
            <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
          </Field>
        </div>
        <div className="flex items-center justify-between py-2 border-t border-line">
          <div>
            <p className="text-sm font-semibold">Aktifkan rule</p>
            <p className="text-xs text-muted">Rule akan langsung aktif setelah disimpan.</p>
          </div>
          <Switch checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
        </div>
      </div>
    </Dialog>
  );
}
