import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { apiFetch } from '../../lib/api';
import type { TelegramAccount, TelegramAccountStatus } from '@eak/shared';

const STATUS_TONE: Record<TelegramAccountStatus, BadgeTone> = {
  active: 'ok',
  warming: 'info',
  flood_wait: 'warn',
  disconnected: 'default',
  banned: 'bad',
  error: 'bad',
};

export function AccountsPage(): JSX.Element {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [phone, setPhone] = useState('');
  const [loginId, setLoginId] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);

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
      setShowForm(false);
      setPhone('');
      setLoginId('');
      setCode('');
      setPassword('');
      void qc.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Telegram Accounts</h1>
          <p className="text-xs text-muted">Kelola akun MTProto. Login via nomor + kode + 2FA opsional.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>Tambah Akun</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader title={loginId ? 'Masukkan Kode' : 'Nomor Telepon'} />
          <CardBody className="space-y-3 max-w-md">
            {!loginId ? (
              <>
                <Input placeholder="+6281234567890" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <div className="flex gap-2">
                  <Button onClick={() => startLogin.mutate()} disabled={!phone || startLogin.isPending}>
                    Kirim Kode
                  </Button>
                  <Button variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
                </div>
              </>
            ) : (
              <>
                <Input placeholder="Kode OTP (5–6 digit)" value={code} onChange={(e) => setCode(e.target.value)} />
                <Input placeholder="Password 2FA (opsional)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <div className="flex gap-2">
                  <Button onClick={() => verify.mutate()} disabled={verify.isPending || !code}>
                    Verifikasi
                  </Button>
                  <Button variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
                </div>
              </>
            )}
            {err && <p className="text-xs text-bad">{err}</p>}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title={`Akun terhubung (${data.length})`} />
        <CardBody>
          {isLoading ? (
            <div className="text-muted text-sm">Memuat…</div>
          ) : data.length === 0 ? (
            <div className="text-sm text-muted">Belum ada akun. Klik "Tambah Akun" untuk mulai.</div>
          ) : (
            <ul className="divide-y divide-line">
              {data.map((a) => (
                <li key={a.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{a.displayName}</p>
                    <p className="text-xs text-muted">{a.phoneMasked} · {a.username ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
