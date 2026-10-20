import { useMutation } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';
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
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          background: 'radial-gradient(60% 50% at 50% 0%, rgb(124 108 242 / 0.1), transparent 70%)',
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-6 justify-center">
          <div
            className="w-11 h-11 rounded-xl grid place-items-center text-white shadow-tg"
            style={{ background: 'linear-gradient(140deg, #37BBFE 0%, #1E88D6 100%)' }}
          >
            <Send size={18} strokeWidth={2.4} />
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">EakPromosi</p>
            <p className="text-[11.5px] text-muted">Mulai gratis dengan paket Free</p>
          </div>
        </div>
        <Card>
          <CardBody className="p-7">
            <h1 className="text-xl font-bold tracking-tight mb-1">Buat Akun</h1>
            <p className="text-sm text-muted mb-6">Tenant pertama otomatis mendapat paket Free (30 hari).</p>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setErr(null);
                register.mutate(form);
              }}
            >
              <Field label="Nama Tenant / Organisasi">
                <Input value={form.tenantName} onChange={(e) => setForm({ ...form, tenantName: e.target.value })} required />
              </Field>
              <Field label="Nama Anda">
                <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </Field>
              <Field label="Password (min 10 karakter)">
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </Field>
              {err ? <Alert tone="bad" title={err} /> : null}
              <Button type="submit" variant="primary" className="w-full" loading={register.isPending}>
                Daftar Gratis
              </Button>
            </form>
            <p className="text-xs text-muted mt-5 text-center">
              Sudah punya akun?{' '}
              <Link to="/login" className="text-tg-ink font-semibold hover:underline">
                Masuk
              </Link>
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
