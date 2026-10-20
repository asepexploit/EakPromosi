import { useMutation } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';
import { ApiError, apiFetch } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';
import type { Login, SessionBundle } from '@eak/shared';

export function LoginPage(): JSX.Element {
  const [form, setForm] = useState<Login>({ email: '', password: '' });
  const [err, setErr] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);
  const setBundle = useAuthStore((s) => s.setBundle);
  const navigate = useNavigate();

  const login = useMutation<SessionBundle, ApiError, Login>({
    mutationFn: (body) => apiFetch<SessionBundle>('/auth/login', { method: 'POST', json: body }),
    onSuccess: (bundle) => {
      setBundle(bundle);
      navigate('/');
    },
    onError: (e) => setErr(e.message || 'Login gagal'),
  });

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgb(42 171 238 / 0.1), transparent 70%)',
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
            <p className="text-[11.5px] text-muted">Telegram Auto Promotion SaaS</p>
          </div>
        </div>
        <Card>
          <CardBody className="p-7">
            <h1 className="text-xl font-bold tracking-tight mb-1">Masuk</h1>
            <p className="text-sm text-muted mb-6">Lanjutkan ke dashboard tenant Anda.</p>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setErr(null);
                login.mutate(form);
              }}
            >
              <Field label="Email">
                <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Password">
                <Input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </Field>
              {err ? <Alert tone="bad" title={err} /> : null}
              <Button type="submit" variant="primary" className="w-full" loading={login.isPending}>
                Masuk
              </Button>
            </form>
            <p className="text-xs text-muted mt-5 text-center">
              Belum punya akun?{' '}
              <Link to="/register" className="text-tg-ink font-semibold hover:underline">
                Daftar gratis
              </Link>
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
