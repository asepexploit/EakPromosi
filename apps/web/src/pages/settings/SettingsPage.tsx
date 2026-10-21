import type { ChangePassword, TenantMember } from '@eak/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { KeyRound, User, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import type { ApiError} from '../../lib/api';
import { apiFetch } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';

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
      <PageHeader title="Settings" description="Profil, keamanan, dan anggota tenant." />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-6">
        <Card>
          <CardHeader title="Profil" icon={<User size={14} />} />
          <CardBody className="space-y-3 text-sm">
            <Row label="Nama" value={user?.displayName ?? '—'} />
            <Row label="Email" value={user?.email ?? '—'} />
            <Row label="Timezone" value={user?.timezone ?? '—'} />
            <Row
              label="Role platform"
              value={user?.isPlatformAdmin ? <Badge tone="violet">Platform Admin</Badge> : <Badge tone="default">Tenant user</Badge>}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Keamanan"
            subtitle="Ganti password; sesi aktif lain akan dicabut otomatis."
            icon={<KeyRound size={14} />}
          />
          <CardBody>
            <form
              className="space-y-3.5 max-w-md"
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
              <Field label="Password saat ini">
                <Input
                  type="password"
                  value={form.currentPassword}
                  onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                  required
                />
              </Field>
              <Field label="Password baru" hint="Minimum 10 karakter">
                <Input
                  type="password"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  required
                />
              </Field>
              <Field label="Konfirmasi password baru">
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                />
              </Field>
              {msg ? (
                <Alert tone={msg.kind === 'ok' ? 'info' : 'bad'} title={msg.text} />
              ) : null}
              <Button type="submit" variant="primary" loading={changePassword.isPending}>
                Ganti Password
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title={`Anggota tenant (${members.length})`} icon={<Users size={14} />} />
        <CardBody className="pt-0">
          <ul className="divide-y divide-line">
            {members.map((m) => (
              <li key={m.id} className="py-3 flex justify-between items-center gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg grid place-items-center text-white font-bold text-xs"
                    style={{ background: 'linear-gradient(140deg, #8B7CF7, #2AABEE)' }}
                  >
                    {m.displayName
                      .split(' ')
                      .map((p) => p[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{m.displayName}</p>
                    <p className="text-xs text-muted truncate">{m.email}</p>
                  </div>
                </div>
                <Badge tone={m.role === 'owner' ? 'violet' : m.role === 'admin' ? 'info' : 'default'} dot={false}>
                  {m.role}
                </Badge>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }): JSX.Element {
  return (
    <div className="flex justify-between items-center py-2 border-b border-line last:border-b-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
