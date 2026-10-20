import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Power, ShieldCheck, Trash2, Users } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '../../components/ui/Alert';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field, Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { apiFetch } from '../../lib/api';
import { cn } from '../../lib/cn';
import { useApiMutation } from '../../lib/mutation';
import type { TelegramAccount, TelegramAccountStatus } from '@eak/shared';

const STATUS_TONE: Record<TelegramAccountStatus, BadgeTone> = {
  active: 'ok',
  warming: 'info',
  flood_wait: 'warn',
  disconnected: 'default',
  banned: 'bad',
  error: 'bad',
};
const STATUS_LABEL: Record<TelegramAccountStatus, string> = {
  active: 'Aktif',
  warming: 'Warming',
  flood_wait: 'Flood wait',
  disconnected: 'Terputus',
  banned: 'Banned',
  error: 'Error',
};

const AVATAR_PALETTE = [
  'linear-gradient(140deg, #37BBFE, #1E88D6)',
  'linear-gradient(140deg, #8B7CF7, #2AABEE)',
  'linear-gradient(140deg, #4ADE80, #16A34A)',
  'linear-gradient(140deg, #FBBF24, #D97706)',
  'linear-gradient(140deg, #F87171, #DC2626)',
];

export function AccountsPage(): JSX.Element {
  const [showForm, setShowForm] = useState(false);
  const [phone, setPhone] = useState('');
  const [loginId, setLoginId] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiFetch<TelegramAccount[]>('/accounts'),
    refetchInterval: 10_000,
  });

  const startLogin = useMutation({
    mutationFn: () => apiFetch<{ loginId: string }>('/accounts/login/start', { method: 'POST', json: { phone } }),
    onSuccess: (res) => {
      setLoginId(res.loginId);
      setErr(null);
    },
    onError: (e: Error) => setErr(e.message),
  });

  const verify = useMutation({
    mutationFn: () =>
      apiFetch<{ status: string }>('/accounts/login/verify', {
        method: 'POST',
        json: { loginId, code, password: password || undefined },
      }),
    onSuccess: () => {
      resetForm();
      void qc.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  function resetForm(): void {
    setShowForm(false);
    setPhone('');
    setLoginId('');
    setCode('');
    setPassword('');
    setErr(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Telegram Accounts"
        description="Kelola akun MTProto (userbot). Login via nomor + kode OTP + 2FA opsional. Session string disimpan terenkripsi."
        actions={
          <Button variant="primary" onClick={() => setShowForm(true)}>
            <Plus size={14} />
            Tambah Akun
          </Button>
        }
      />

      <Alert
        tone="info"
        title="Hormati rate limit Telegram"
        description="Akun baru di-warming otomatis 3 hari sebelum di-broadcast. Flood-wait dihormati via rescheduling, bukan retry agresif."
      />

      {showForm && (
        <LoginDialog
          loginId={loginId}
          phone={phone}
          code={code}
          password={password}
          err={err}
          submitting={startLogin.isPending || verify.isPending}
          onPhoneChange={setPhone}
          onCodeChange={setCode}
          onPasswordChange={setPassword}
          onCancel={resetForm}
          onBack={() => setLoginId('')}
          onStart={() => startLogin.mutate()}
          onVerify={() => verify.mutate()}
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-[200px]" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Users size={24} />}
              title="Belum ada akun Telegram"
              description="Tambahkan akun MTProto pertama untuk mulai Discovery, Join, dan Broadcast."
              action={
                <Button variant="primary" onClick={() => setShowForm(true)}>
                  <Plus size={14} /> Tambah Akun Pertama
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map((a, idx) => (
            <AccountCard
              key={a.id}
              account={a}
              avatarGradient={AVATAR_PALETTE[idx % AVATAR_PALETTE.length] ?? AVATAR_PALETTE[0]!}
            />
          ))}
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="min-h-[260px] rounded-lg border-[1.5px] border-dashed border-line bg-transparent flex flex-col items-center justify-center gap-2 text-muted hover:border-tg hover:text-tg-ink hover:bg-tg/5 transition-colors"
          >
            <div className="w-11 h-11 rounded-xl bg-tg/10 text-tg-ink grid place-items-center">
              <Plus size={18} />
            </div>
            <span className="text-sm font-semibold">Tambah akun baru</span>
          </button>
        </div>
      )}
    </div>
  );
}

function AccountCard({ account, avatarGradient }: { account: TelegramAccount; avatarGradient: string }): JSX.Element {
  const qc = useQueryClient();
  const confirm = useConfirm();

  const disconnect = useApiMutation(() => apiFetch<void>(`/accounts/${account.id}/disconnect`, { method: 'POST' }), {
    successMessage: 'Akun diputus.',
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
  const remove = useApiMutation(() => apiFetch<void>(`/accounts/${account.id}`, { method: 'DELETE' }), {
    successMessage: 'Akun dihapus.',
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['accounts'] }),
  });

  const handleDisconnect = async (): Promise<void> => {
    const ok = await confirm.confirm({
      title: `Putuskan "${account.displayName}"?`,
      description: 'Session string tetap tersimpan — Anda bisa reconnect nanti.',
      confirmLabel: 'Putuskan',
    });
    if (ok) disconnect.mutate();
  };
  const handleDelete = async (): Promise<void> => {
    const ok = await confirm.confirm({
      title: `Hapus "${account.displayName}" permanen?`,
      description: 'Session string akan dihapus. Tidak bisa di-undo.',
      tone: 'danger',
      confirmLabel: 'Hapus permanen',
    });
    if (ok) remove.mutate();
  };

  const initials = (account.displayName || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const statusDotTone =
    account.status === 'active'
      ? 'bg-ok'
      : account.status === 'warming' || account.status === 'flood_wait'
        ? 'bg-warn'
        : account.status === 'banned' || account.status === 'error'
          ? 'bg-bad'
          : 'bg-muted';

  return (
    <Card interactive className="overflow-hidden">
      <div className="p-5 flex flex-col gap-3.5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="w-11 h-11 rounded-full grid place-items-center text-white font-bold text-sm"
              style={{ background: avatarGradient }}
            >
              {initials}
            </div>
            <span
              className={cn(
                'absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full border-[2.5px] border-panel',
                statusDotTone,
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{account.displayName}</p>
            <p className="text-xs text-muted truncate">
              {account.phoneMasked} · {account.username ? `@${account.username}` : '—'}
            </p>
          </div>
          <Badge tone={STATUS_TONE[account.status]} pulse={account.status === 'active'}>
            {STATUS_LABEL[account.status]}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Join', value: account.joinedGroupsCount },
            { label: 'Sent /hari', value: account.sentToday },
            { label: 'Kapabilitas', value: account.capabilities.length },
          ].map((s) => (
            <div key={s.label} className="bg-sunk rounded-lg px-2.5 py-2">
              <p className="text-[11px] text-muted">{s.label}</p>
              <p className="text-sm font-bold tabular leading-tight whitespace-nowrap">{s.value}</p>
            </div>
          ))}
        </div>

        {account.lastError ? (
          <p className="text-xs text-bad bg-bad/5 border border-bad/20 px-3 py-2 rounded-md">{account.lastError}</p>
        ) : null}

        <div className="flex gap-2 pt-1 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            disabled={account.status === 'disconnected' || disconnect.isPending}
            loading={disconnect.isPending}
            className="flex-1"
          >
            <Power size={13} /> {account.status === 'disconnected' ? 'Terputus' : 'Disconnect'}
          </Button>
          <Button variant="danger" size="sm" iconOnly aria-label="Hapus akun" onClick={handleDelete}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface LoginDialogProps {
  loginId: string;
  phone: string;
  code: string;
  password: string;
  err: string | null;
  submitting: boolean;
  onPhoneChange: (v: string) => void;
  onCodeChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onCancel: () => void;
  onBack: () => void;
  onStart: () => void;
  onVerify: () => void;
}

function LoginDialog(props: LoginDialogProps): JSX.Element {
  return (
    <Card>
      <CardHeader
        title={props.loginId ? 'Verifikasi Kode OTP' : 'Nomor Telepon'}
        subtitle={
          props.loginId
            ? 'Kami mengirim kode via Telegram ke nomor yang Anda masukkan. Masukkan di sini dalam 5 menit.'
            : 'Masukkan nomor Telegram dengan kode negara (misal +6281234567890).'
        }
        icon={<ShieldCheck size={14} />}
      />
      <CardBody className="max-w-md space-y-3.5">
        {!props.loginId ? (
          <>
            <Field label="Nomor telepon">
              <Input
                placeholder="+6281234567890"
                value={props.phone}
                onChange={(e) => props.onPhoneChange(e.target.value)}
                autoFocus
              />
            </Field>
            <div className="flex gap-2 pt-1">
              <Button variant="primary" onClick={props.onStart} disabled={!props.phone || props.submitting} loading={props.submitting}>
                Kirim Kode
              </Button>
              <Button variant="ghost" onClick={props.onCancel}>
                Batal
              </Button>
            </div>
          </>
        ) : (
          <>
            <Field label="Kode OTP" hint="5–6 digit dari Telegram">
              <Input placeholder="123456" value={props.code} onChange={(e) => props.onCodeChange(e.target.value)} autoFocus />
            </Field>
            <Field label="Password 2FA (opsional)" hint="Hanya jika akun Anda mengaktifkan cloud password.">
              <Input type="password" value={props.password} onChange={(e) => props.onPasswordChange(e.target.value)} />
            </Field>
            <div className="flex gap-2 pt-1">
              <Button variant="primary" onClick={props.onVerify} disabled={!props.code || props.submitting} loading={props.submitting}>
                Verifikasi
              </Button>
              <Button variant="ghost" onClick={props.onBack}>
                <ArrowLeft size={14} /> Ganti nomor
              </Button>
            </div>
          </>
        )}
        {props.err ? <p className="text-xs text-bad">{props.err}</p> : null}
      </CardBody>
    </Card>
  );
}
