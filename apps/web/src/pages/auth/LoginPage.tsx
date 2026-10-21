import type { Login, SessionBundle } from '@eak/shared';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Send, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';
import type { ApiError} from '../../lib/api';
import { apiFetch } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';

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
    <div className="min-h-screen bg-bg text-fg relative">
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{ background: 'radial-gradient(60% 50% at 50% 0%, rgb(42 171 238 / 0.12), transparent 70%)' }}
        aria-hidden
      />
      <div className="relative min-h-screen grid lg:grid-cols-2">
        <aside className="hidden lg:flex flex-col justify-between p-10 border-r border-line bg-sunk/40">
          <div className="flex items-center gap-2.5">
            <div
              className="w-11 h-11 rounded-xl grid place-items-center text-white shadow-tg"
              style={{ background: 'linear-gradient(140deg, #37BBFE 0%, #1E88D6 100%)' }}
            >
              <Send size={18} strokeWidth={2.4} />
            </div>
            <div>
              <p className="font-bold text-lg leading-tight">EakPromosi</p>
              <p className="text-xs text-muted">Telegram Auto Promotion SaaS</p>
            </div>
          </div>

          <div className="max-w-sm">
            <h2 className="text-2xl font-bold tracking-tight mb-3">
              Promosi di Telegram, serahkan ke mesin.
            </h2>
            <p className="text-sm text-muted mb-6">
              Auto Discovery, Auto Join, Broadcast, dan Auto-Reply dalam satu tempat — dengan safety guard anti
              flood-wait dan tenant isolation.
            </p>
            <ul className="space-y-2.5 text-sm">
              {[
                'Session MTProto terenkripsi (AES-256-GCM)',
                'Idempotent worker + honor flood-wait',
                'Pembayaran via Pakasir, aktivasi otomatis',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-ok flex-none mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-muted flex items-center gap-1.5">
            <ShieldCheck size={12} /> Data tenant diisolasi; audit log penuh.
          </p>
        </aside>

        <main className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md">
            <div className="flex items-center gap-2.5 mb-6 lg:hidden">
              <div
                className="w-10 h-10 rounded-xl grid place-items-center text-white shadow-tg"
                style={{ background: 'linear-gradient(140deg, #37BBFE 0%, #1E88D6 100%)' }}
              >
                <Send size={18} strokeWidth={2.4} />
              </div>
              <div>
                <p className="font-bold text-base leading-tight">EakPromosi</p>
                <p className="text-[11.5px] text-muted">Telegram Automation</p>
              </div>
            </div>

            <Card>
              <CardBody className="p-6 md:p-7">
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
                    <Input
                      type="email"
                      required
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </Field>
                  <Field label="Password">
                    <Input
                      type="password"
                      required
                      autoComplete="current-password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                  </Field>
                  {err ? <Alert tone="bad" title={err} /> : null}
                  <Button type="submit" variant="primary" className="w-full" loading={login.isPending}>
                    Masuk <ArrowRight size={14} />
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
        </main>
      </div>
    </div>
  );
}
