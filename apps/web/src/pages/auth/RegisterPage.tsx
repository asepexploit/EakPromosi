import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { ApiError, apiFetch } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';
import type { Register, SessionBundle } from '@eak/shared';

export function RegisterPage(): JSX.Element {
  const [form, setForm] = useState<Register>({ email: '', password: '', displayName: '', tenantName: '' });
  const [err, setErr] = useState<string | null>(null);
  const setBundle = useAuthStore((s) => s.setBundle);
  const navigate = useNavigate();

  const register = useMutation<SessionBundle, ApiError, Register>({
    mutationFn: (body) => apiFetch<SessionBundle>('/auth/register', { method: 'POST', json: body }),
    onSuccess: (bundle) => {
      setBundle(bundle);
      navigate('/');
    },
    onError: (e) => setErr(e.message || 'Registrasi gagal'),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader title="Daftar EakPromosi" subtitle="Tenant pertama otomatis mendapat paket Free" />
        <CardBody>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setErr(null);
              register.mutate(form);
            }}
          >
            <label className="block">
              <span className="text-xs text-muted">Nama Tenant / Organisasi</span>
              <Input value={form.tenantName} onChange={(e) => setForm({ ...form, tenantName: e.target.value })} required />
            </label>
            <label className="block">
              <span className="text-xs text-muted">Nama Anda</span>
              <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
            </label>
            <label className="block">
              <span className="text-xs text-muted">Email</span>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </label>
            <label className="block">
              <span className="text-xs text-muted">Password (min 10 karakter)</span>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </label>
            {err && <p className="text-xs text-bad">{err}</p>}
            <Button type="submit" className="w-full" disabled={register.isPending}>
              {register.isPending ? 'Memproses…' : 'Buat Akun'}
            </Button>
          </form>
          <p className="text-xs text-muted mt-4 text-center">
            Sudah punya akun? <Link to="/login" className="text-tg-deep hover:underline">Masuk</Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
