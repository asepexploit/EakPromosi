import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { ApiError, apiFetch } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';
import type { ChangePassword, TenantMember } from '@eak/shared';

export function SettingsPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const { data: members = [] } = useQuery({
    queryKey: ['tenants', 'members'],
    queryFn: () => apiFetch<TenantMember[]>('/tenants/members'),
  });
  const [form, setForm] = useState<ChangePassword>({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);

  const changePassword = useMutation<void, ApiError, ChangePassword>({
    mutationFn: (body) => apiFetch<void>('/auth/change-password', { method: 'POST', json: body }),
    onSuccess: () => {
      setMsg({ kind: 'ok', text: 'Password berhasil diubah. Sesi lain sudah dicabut.' });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (e) => setMsg({ kind: 'bad', text: e.message }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Card>
        <CardHeader title="Profil" />
        <CardBody className="text-sm space-y-1">
          <div><span className="text-muted">Nama:</span> {user?.displayName}</div>
          <div><span className="text-muted">Email:</span> {user?.email}</div>
          <div><span className="text-muted">Timezone:</span> {user?.timezone}</div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Keamanan" subtitle="Ganti password; sesi aktif lain akan dicabut otomatis." />
        <CardBody className="max-w-md">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setMsg(null);
              if (form.newPassword !== form.confirmPassword) {
                setMsg({ kind: 'bad', text: 'Konfirmasi password baru berbeda' });
                return;
              }
              changePassword.mutate(form);
            }}
          >
            <label className="block">
              <span className="text-xs text-muted">Password saat ini</span>
              <Input type="password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required />
            </label>
            <label className="block">
              <span className="text-xs text-muted">Password baru (min 10)</span>
              <Input type="password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required />
            </label>
            <label className="block">
              <span className="text-xs text-muted">Konfirmasi password baru</span>
              <Input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />
            </label>
            {msg && <p className={msg.kind === 'ok' ? 'text-xs text-ok' : 'text-xs text-bad'}>{msg.text}</p>}
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? 'Memproses…' : 'Ganti Password'}
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`Anggota tenant (${members.length})`} />
        <CardBody>
          <ul className="divide-y divide-line text-sm">
            {members.map((m) => (
              <li key={m.id} className="py-2 flex justify-between">
                <div>
                  <p className="font-medium">{m.displayName}</p>
                  <p className="text-xs text-muted">{m.email}</p>
                </div>
                <span className="text-xs text-muted uppercase">{m.role}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
