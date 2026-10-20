import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Compass, LinkIcon, Play, Plus, Trash2 } from 'lucide-react';
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
import { Progress } from '../../components/ui/Progress';
import { Switch } from '../../components/ui/Switch';
import { TBody, THead, Table, TMain, TSub } from '../../components/ui/Table';
import { apiFetch } from '../../lib/api';
import { useApiMutation } from '../../lib/mutation';
import type { DiscoveredLink, DiscoverySource, TelegramAccount } from '@eak/shared';

export function DiscoveryPage(): JSX.Element {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [addOpen, setAddOpen] = useState(false);

  const { data: sources = [], isLoading: sourcesLoading } = useQuery({
    queryKey: ['discovery', 'sources'],
    queryFn: () => apiFetch<DiscoverySource[]>('/discovery/sources'),
  });
  const { data: links = [] } = useQuery({
    queryKey: ['discovery', 'links'],
    queryFn: () => apiFetch<DiscoveredLink[]>('/discovery/links'),
  });

  const scan = useApiMutation(
    (id: string) => apiFetch<{ queued: boolean }>(`/discovery/sources/${id}/run`, { method: 'POST' }),
    {
      successMessage: 'Scan dijadwalkan — worker akan memproses dalam beberapa detik.',
      onSuccess: () => void qc.invalidateQueries({ queryKey: ['discovery'] }),
    },
  );

  const remove = useApiMutation(
    (id: string) => apiFetch<void>(`/discovery/sources/${id}`, { method: 'DELETE' }),
    {
      successMessage: 'Source dihapus.',
      onSuccess: () => void qc.invalidateQueries({ queryKey: ['discovery', 'sources'] }),
    },
  );

  const handleDelete = async (s: DiscoverySource): Promise<void> => {
    const ok = await confirm.confirm({
      title: `Hapus source "${s.title}"?`,
      description: 'Link yang sudah ditemukan akan tetap ada; source berhenti di-scan.',
      tone: 'danger',
      confirmLabel: 'Hapus',
    });
    if (ok) remove.mutate(s.id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auto Discovery"
        description="Sumber yang dikonfigurasi akan di-scan periodik via userbot. Discovery tidak auto-join — gunakan modul Join."
        actions={
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Tambah Source
          </Button>
        }
      />

      <Alert
        tone="info"
        title="Discovery hanya menghasilkan link"
        description="Link yang ditemukan masuk ke tabel discovered_links. Join adalah antrean terpisah agar bisa dijadwal & dibatasi per akun."
      />

      <Card>
        <CardHeader
          title={`Sumber (${sources.length})`}
          subtitle="Grup/channel yang akun userbot sudah ikuti dan diizinkan untuk dibaca."
          icon={<Compass size={14} />}
        />
        <CardBody>
          {sourcesLoading ? (
            <div className="skeleton h-[200px]" />
          ) : sources.length === 0 ? (
            <EmptyState
              icon={<Compass size={24} />}
              title="Belum ada sumber discovery"
              description="Tambah grup atau channel yang akun userbot sudah ikuti untuk mulai scan."
              action={
                <Button variant="primary" onClick={() => setAddOpen(true)}>
                  <Plus size={14} /> Tambah Source Pertama
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-line-soft">
              {sources.map((s) => (
                <li key={s.id} className="py-3 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{s.title}</p>
                    <p className="text-xs text-muted">
                      Max {s.maxLinksPerDay}/hari · mentions {s.detectMentions ? 'ya' : 'tidak'} · {s.linksFound} ditemukan
                      {s.lastScannedAt ? ` · last scan ${new Date(s.lastScannedAt).toLocaleString('id-ID')}` : ''}
                    </p>
                    <Progress value={(s.linksFound / s.maxLinksPerDay) * 100} className="mt-2 max-w-sm" tone="tg" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={s.enabled ? 'ok' : 'default'} pulse={s.enabled}>
                      {s.enabled ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      loading={scan.isPending && scan.variables === s.id}
                      onClick={() => scan.mutate(s.id)}
                    >
                      <Play size={13} /> Scan
                    </Button>
                    <Button variant="ghost" size="sm" iconOnly onClick={() => handleDelete(s)} aria-label="Hapus source">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={`Link ditemukan (${links.length})`}
          subtitle="Deduplicate otomatis per tenant (satu grup = satu entri)."
          icon={<LinkIcon size={14} />}
        />
        <CardBody className="pt-0">
          {links.length === 0 ? (
            <EmptyState title="Belum ada link ditemukan" description="Link muncul setelah worker telegram:link-detect menjalankan source." />
          ) : (
            <Table>
              <THead>
                <tr>
                  <th>URL</th>
                  <th>Jenis</th>
                  <th>Status</th>
                  <th>Terakhir dilihat</th>
                </tr>
              </THead>
              <TBody>
                {links.map((l) => (
                  <tr key={l.id}>
                    <td className="mono">{l.url}</td>
                    <td>
                      <Badge tone={l.kind === 'private_invite' ? 'violet' : 'info'} dot={false}>
                        {l.kind.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={l.status === 'valid' ? 'ok' : l.status === 'invalid' ? 'bad' : 'default'}>{l.status}</Badge>
                    </td>
                    <td className="text-xs text-muted tabular">{new Date(l.lastSeenAt).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <AddSourceDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function AddSourceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }): JSX.Element {
  const qc = useQueryClient();
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiFetch<TelegramAccount[]>('/accounts'),
    enabled: open,
  });
  const [form, setForm] = useState({
    name: '',
    accountId: '',
    telegramChatId: '',
    mentionEnabled: false,
    dailyLimit: 500,
  });

  const create = useApiMutation(
    (body: typeof form) => apiFetch<DiscoverySource>('/discovery/sources', { method: 'POST', json: body }),
    {
      successMessage: 'Source berhasil ditambahkan.',
      onSuccess: () => {
        onOpenChange(false);
        setForm({ name: '', accountId: '', telegramChatId: '', mentionEnabled: false, dailyLimit: 500 });
        void qc.invalidateQueries({ queryKey: ['discovery', 'sources'] });
      },
    },
  );

  const canSubmit = form.name && form.accountId && form.telegramChatId;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Tambah Discovery Source"
      description="Pilih akun yang akan membaca grup/channel, lalu beri target chat id."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button variant="primary" disabled={!canSubmit} loading={create.isPending} onClick={() => create.mutate(form)}>
            Simpan
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <Field label="Nama source" hint="Contoh: Promo Grup Jakarta">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
        </Field>
        <Field label="Akun userbot">
          <select
            value={form.accountId}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
            className="h-9 w-full rounded-lg border border-line bg-bg px-3 text-[13.5px] outline-none focus:border-tg focus:shadow-focus-tg"
          >
            <option value="">— Pilih akun —</option>
            {accounts
              .filter((a) => a.status === 'active' || a.status === 'warming')
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.displayName} ({a.phoneMasked})
                </option>
              ))}
          </select>
          {accounts.length === 0 && (
            <p className="text-xs text-warn mt-1">Belum ada akun aktif — tambahkan di Telegram Accounts dulu.</p>
          )}
        </Field>
        <Field label="Telegram chat ID / username" hint="ID numerik atau @username grup/channel.">
          <Input
            value={form.telegramChatId}
            onChange={(e) => setForm({ ...form, telegramChatId: e.target.value })}
            placeholder="@contohgrup atau -100123456789"
          />
        </Field>
        <div className="flex items-center justify-between py-2 border-y border-line-soft">
          <div>
            <p className="text-sm font-semibold">Deteksi mentions</p>
            <p className="text-xs text-muted">Juga tangkap @username yang disebutkan di dalam pesan.</p>
          </div>
          <Switch checked={form.mentionEnabled} onChange={(v) => setForm({ ...form, mentionEnabled: v })} />
        </div>
        <Field label="Batas link per hari" hint="Default 500. Naikkan hati-hati.">
          <Input
            type="number"
            min={1}
            max={10_000}
            value={form.dailyLimit}
            onChange={(e) => setForm({ ...form, dailyLimit: Number(e.target.value) || 500 })}
          />
        </Field>
      </div>
    </Dialog>
  );
}
