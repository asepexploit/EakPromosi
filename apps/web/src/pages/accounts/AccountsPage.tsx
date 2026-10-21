import type { AccountLoginStatus, TelegramAccount } from '@eak/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Plus, Power, RotateCcw, Trash2, Users } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field, Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { apiFetch } from '../../lib/api';
import { cn } from '../../lib/cn';
import { useApiMutation } from '../../lib/mutation';
import { ACCOUNT_STATUS } from '../../lib/statusLabels';

const AVATAR_PALETTE = [
  'linear-gradient(140deg, #37BBFE, #1E88D6)',
  'linear-gradient(140deg, #8B7CF7, #2AABEE)',
  'linear-gradient(140deg, #4ADE80, #16A34A)',
  'linear-gradient(140deg, #FBBF24, #D97706)',
  'linear-gradient(140deg, #F87171, #DC2626)',
];

/** Must match packages/shared/src/schemas/account.ts PhoneNumberSchema. */
const PHONE_RE = /^\+[1-9]\d{7,14}$/;

/**
 * Front-end state machine for the add-account dialog. Mirrors the worker's
 * Redis `stage` plus two UI-only transients (`idle`/`starting`/`verifying`).
 *
 *   idle            — dialog closed.
 *   phone_input     — collecting the phone number.
 *   starting        — POST /login/start in-flight (Kirim Kode spinner).
 *   awaiting_code   — worker reached stage=code_sent (OTP arrived at Telegram).
 *   awaiting_pw     — worker reached stage=password_required (2FA step).
 *   verifying       — POST /login/verify in-flight.
 *   failed          — worker reached stage=failed; the inline red box shows.
 *   completed       — worker reached stage=completed; dialog closes + toast.
 */
type DialogStage = 'phone_input' | 'starting' | 'awaiting_code' | 'awaiting_pw' | 'verifying' | 'failed' | 'completed';

const STAGE_LABEL: Record<AccountLoginStatus['stage'], string> = {
  pending: 'Mengantrikan permintaan…',
  connecting: 'Menghubungi server Telegram…',
  code_sent: 'Kode OTP terkirim — periksa aplikasi Telegram Anda.',
  password_required: 'Password 2FA diperlukan.',
  completed: 'Login berhasil.',
  failed: 'Gagal.',
};

export function AccountsPage(): JSX.Element {
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiFetch<TelegramAccount[]>('/accounts'),
    refetchInterval: 10_000,
  });

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

      <LoginDialog
        open={showForm}
        onClose={() => setShowForm(false)}
        onCompleted={() => void qc.invalidateQueries({ queryKey: ['accounts'] })}
      />

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
          <Badge tone={ACCOUNT_STATUS[account.status].tone} pulse={account.status === 'active'}>
            {ACCOUNT_STATUS[account.status].label}
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
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

/**
 * Add-account wizard with an explicit state machine so no click is ever a
 * silent no-op. Every transition either (a) shows a loading indicator in the
 * action button, (b) toasts success/failure, or (c) renders a red error box
 * with the translated worker message + a Retry / Ganti nomor affordance.
 */
function LoginDialog({ open, onClose, onCompleted }: LoginDialogProps): JSX.Element {
  const toast = useToast();
  const [phone, setPhone] = useState('');
  const [loginId, setLoginId] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<{ message: string; code?: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  // Guard the completion effect — fires once per successful attempt so a stale
  // "completed" cached by react-query between opens doesn't close the dialog
  // immediately on the next add.
  const consumedCompletionFor = useRef<string | null>(null);

  const normalizedPhone = phone.trim();
  const phoneValid = PHONE_RE.test(normalizedPhone);
  const phoneError = !dirty || phoneValid ? null : 'Format tidak valid. Contoh: +6281234567890.';

  const resetState = (): void => {
    setPhone('');
    setLoginId('');
    setCode('');
    setPassword('');
    setErr(null);
    setDirty(false);
  };

  // Mutations ------------------------------------------------------------
  const startLogin = useApiMutation(
    () => apiFetch<{ loginId: string }>('/accounts/login/start', { method: 'POST', json: { phone: normalizedPhone } }),
    {
      successMessage: 'Kode OTP dikirim ke Telegram Anda.',
      onSuccess: (res) => {
        setLoginId(res.loginId);
        setErr(null);
      },
      onError: (e) => setErr({ message: e.message, code: e.code }),
    },
  );

  const verify = useApiMutation(
    () =>
      apiFetch<{ status: string }>('/accounts/login/verify', {
        method: 'POST',
        json: { loginId, code, ...(password ? { password } : {}) },
      }),
    {
      successMessage: 'Kode diterima, menunggu Telegram memverifikasi…',
      onError: (e) => setErr({ message: e.message, code: e.code }),
    },
  );

  // Fire-and-forget cancel: we don't block the UI on the response. If it 500s
  // the worker's active-login key still TTLs out in 5 minutes.
  const cancel = useApiMutation(
    (id: string) => apiFetch<void>(`/accounts/login/${id}/cancel`, { method: 'POST' }),
    {},
  );

  // Status polling ------------------------------------------------------
  const { data: loginStatus } = useQuery({
    queryKey: ['accounts', 'login-status', loginId],
    queryFn: () => apiFetch<AccountLoginStatus>(`/accounts/login/${loginId}/status`),
    enabled: Boolean(loginId) && open,
    refetchInterval: (q) => {
      const stage = q.state.data?.stage;
      return stage === 'completed' || stage === 'failed' ? false : 1500;
    },
    staleTime: 0,
    retry: false,
  });

  // React to worker-side transitions.
  useEffect(() => {
    if (!loginStatus) return;
    if (loginStatus.stage === 'failed' && consumedCompletionFor.current !== loginId) {
      const next: { message: string; code?: string } = {
        message: loginStatus.message ?? loginStatus.errorCode ?? 'Login gagal.',
      };
      if (loginStatus.errorCode) next.code = loginStatus.errorCode;
      setErr(next);
    } else if (loginStatus.stage === 'completed' && consumedCompletionFor.current !== loginId) {
      consumedCompletionFor.current = loginId;
      toast.success('Akun Telegram berhasil terhubung.');
      onCompleted();
      resetState();
      onClose();
    }
  }, [loginStatus?.stage, loginStatus?.message, loginStatus?.errorCode, loginId, loginStatus, onClose, onCompleted, resetState, toast]);

  // Derived stage ------------------------------------------------------
  const dialogStage: DialogStage = useMemo(() => {
    if (err && !verify.isPending && !startLogin.isPending) return 'failed';
    if (startLogin.isPending) return 'starting';
    if (verify.isPending) return 'verifying';
    if (!loginId) return 'phone_input';
    if (loginStatus?.stage === 'password_required') return 'awaiting_pw';
    if (loginStatus?.stage === 'code_sent') return 'awaiting_code';
    if (loginStatus?.stage === 'completed') return 'completed';
    // Default: we POSTed /login/start, response returned, worker hasn't flipped
    // status to code_sent yet — show the "connecting" strip.
    return 'awaiting_code';
  }, [err, startLogin.isPending, verify.isPending, loginId, loginStatus?.stage]);

  const needsPassword = loginStatus?.stage === 'password_required';
  const canSubmitVerify =
    (loginStatus?.stage === 'code_sent' || loginStatus?.stage === 'password_required') && !verify.isPending;

  const verifyDisabledReason: string | null = (() => {
    if (dialogStage === 'failed') return 'Perbaiki error dulu dengan Coba Lagi atau Ganti Nomor.';
    if (!code) return 'Masukkan kode OTP dulu.';
    if (needsPassword && !password) return 'Password 2FA diperlukan.';
    if (!canSubmitVerify) return 'Menunggu kode OTP dari Telegram…';
    return null;
  })();

  // Handlers -----------------------------------------------------------
  const handleStart = (): void => {
    setDirty(true);
    if (!phoneValid) return;
    setErr(null);
    startLogin.mutate();
  };
  const handleVerify = (): void => {
    if (verifyDisabledReason) return;
    setErr(null);
    verify.mutate();
  };
  const handleRetryVerify = (): void => {
    setErr(null);
    if (code) verify.mutate();
  };
  const handleBackToPhone = (): void => {
    // User wants a different number — cancel server-side so worker's waitCode
    // bails cleanly instead of eventually timing out and polluting logs.
    if (loginId) cancel.mutate(loginId);
    setLoginId('');
    setCode('');
    setPassword('');
    setErr(null);
    consumedCompletionFor.current = null;
  };
  const handleDismiss = (): void => {
    if (loginId && loginStatus?.stage !== 'completed') cancel.mutate(loginId);
    resetState();
    onClose();
  };

  // Render -------------------------------------------------------------
  const title = loginId ? (needsPassword ? 'Masukkan Password 2FA' : 'Verifikasi Kode OTP') : 'Tambah Akun Telegram';
  const description = loginId
    ? needsPassword
      ? 'Akun ini mengaktifkan cloud password. Masukkan password 2FA Telegram.'
      : 'Kami mengirim kode via Telegram ke nomor Anda. Masukkan di sini dalam 5 menit.'
    : 'Login MTProto: nomor + kode OTP + 2FA opsional. Session disimpan terenkripsi.';

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleDismiss();
      }}
      title={title}
      description={description}
      size="md"
    >
      <div className="space-y-3.5">
        {/* Progress strip — hidden when there's a failure (red box takes over). */}
        {loginId && dialogStage !== 'failed' ? <ProgressStrip stage={loginStatus?.stage ?? 'pending'} /> : null}

        {!loginId ? (
          <PhoneStep
            phone={phone}
            onPhoneChange={(v) => {
              setPhone(v);
              if (!dirty) setDirty(true);
            }}
            phoneError={phoneError}
            onSubmit={handleStart}
            onCancel={handleDismiss}
            submitting={startLogin.isPending}
            canSubmit={phoneValid && !startLogin.isPending}
          />
        ) : (
          <CodeStep
            code={code}
            password={password}
            needsPassword={needsPassword}
            onCodeChange={setCode}
            onPasswordChange={setPassword}
            onSubmit={handleVerify}
            onRetry={handleRetryVerify}
            onBack={handleBackToPhone}
            verifying={verify.isPending}
            stageFailed={dialogStage === 'failed'}
            disabledReason={verifyDisabledReason}
          />
        )}

        {err ? <ErrorBox title="Login gagal" message={err.message} {...(err.code ? { code: err.code } : {})} /> : null}
      </div>
    </Dialog>
  );
}

// -------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------

function ProgressStrip({ stage }: { stage: AccountLoginStatus['stage'] }): JSX.Element {
  return (
    <div className="flex items-center gap-2 rounded-md bg-sunk border border-line/70 px-3 py-2 text-xs">
      <span className="w-1.5 h-1.5 rounded-full bg-tg animate-pulse-ring shrink-0" aria-hidden />
      <span className="text-fg/85">{STAGE_LABEL[stage] ?? stage}</span>
    </div>
  );
}

function ErrorBox({ title, message, code }: { title: string; message: string; code?: string }): JSX.Element {
  return (
    <div className="rounded-md border border-bad/30 bg-bad/5 px-3 py-2.5 text-xs text-bad space-y-1">
      <div className="flex items-center gap-1.5 font-semibold">
        <AlertCircle size={13} aria-hidden />
        <span>{title}</span>
      </div>
      <p className="text-bad/90 leading-relaxed break-words">{message}</p>
      {code ? <p className="font-mono text-[10.5px] text-bad/60">{code}</p> : null}
    </div>
  );
}

interface PhoneStepProps {
  phone: string;
  phoneError: string | null;
  submitting: boolean;
  canSubmit: boolean;
  onPhoneChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function PhoneStep(p: PhoneStepProps): JSX.Element {
  return (
    <>
      <Field
        label="Nomor telepon Telegram"
        hint="Awali dengan + dan kode negara, misal +6281234567890."
        error={p.phoneError}
      >
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none text-[13.5px] font-semibold">
            +
          </span>
          <Input
            placeholder="6281234567890"
            value={p.phone.startsWith('+') ? p.phone.slice(1) : p.phone}
            onChange={(e) => {
              const raw = e.target.value.replace(/\s+/g, '');
              p.onPhoneChange(`+${raw.replace(/^\+/, '')}`);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && p.canSubmit) p.onSubmit();
            }}
            className="pl-6"
            autoFocus
            inputMode="tel"
            autoComplete="tel"
          />
        </div>
      </Field>
      <div className="flex gap-2 pt-1">
        <Button
          variant="primary"
          onClick={p.onSubmit}
          disabled={!p.canSubmit}
          loading={p.submitting}
          {...(!p.canSubmit && !p.submitting ? { title: p.phoneError ?? 'Isi nomor telepon dulu.' } : {})}
        >
          Kirim Kode OTP
        </Button>
        <Button variant="ghost" onClick={p.onCancel}>
          Batal
        </Button>
      </div>
    </>
  );
}

interface CodeStepProps {
  code: string;
  password: string;
  needsPassword: boolean;
  verifying: boolean;
  stageFailed: boolean;
  disabledReason: string | null;
  onCodeChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: () => void;
  onRetry: () => void;
  onBack: () => void;
}

function CodeStep(p: CodeStepProps): JSX.Element {
  const buttonDisabled = p.disabledReason !== null;

  // When we're in a failed state but the user still has a code typed, swap the
  // CTA to "Coba Lagi" so the user has a clear re-fire path without having to
  // re-type everything or back out.
  const retryMode = p.stageFailed && p.code.length > 0;

  return (
    <>
      <Field label="Kode OTP" hint="5–6 digit yang dikirim Telegram ke aplikasi Anda.">
        <Input
          placeholder="123456"
          value={p.code}
          onChange={(e) => p.onCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !buttonDisabled) p.onSubmit();
          }}
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
        />
      </Field>
      <Field
        label={p.needsPassword ? 'Password 2FA (wajib)' : 'Password 2FA'}
        hint={p.needsPassword ? 'Akun ini mengaktifkan cloud password Telegram.' : 'Isi hanya jika akun mengaktifkan cloud password.'}
      >
        <Input
          type="password"
          value={p.password}
          onChange={(e) => p.onPasswordChange(e.target.value)}
          autoComplete="current-password"
        />
      </Field>
      <div className="flex gap-2 pt-1 flex-wrap">
        {retryMode ? (
          <Button variant="primary" onClick={p.onRetry} loading={p.verifying}>
            <RotateCcw size={14} /> Coba Lagi
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={p.onSubmit}
            disabled={buttonDisabled}
            loading={p.verifying}
            {...(buttonDisabled && !p.verifying ? { title: p.disabledReason ?? '' } : {})}
          >
            {p.needsPassword ? 'Kirim Password' : 'Verifikasi'}
          </Button>
        )}
        <Button variant="ghost" onClick={p.onBack}>
          <ArrowLeft size={14} /> Ganti nomor
        </Button>
      </div>
    </>
  );
}
