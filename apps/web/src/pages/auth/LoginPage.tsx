import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
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
      <Card className="w-full max-w-md">
        <CardHeader title="Masuk ke EakPromosi" subtitle="Telegram Auto Promotion SaaS" />
        <CardBody>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setErr(null);
              login.mutate(form);
            }}
          >
            <label className="block">
              <span className="text-xs text-muted">Email</span>
              <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs text-muted">Password</span>
              <Input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </label>
            {err && <p className="text-xs text-bad">{err}</p>}
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? 'Memproses…' : 'Masuk'}
            </Button>
          </form>
          <p className="text-xs text-muted mt-4 text-center">
            Belum punya akun? <Link to="/register" className="text-tg-deep hover:underline">Daftar</Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
