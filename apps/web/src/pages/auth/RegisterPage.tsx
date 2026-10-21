import type { Register, SessionBundle } from '@eak/shared';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Send } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';
import type { ApiError} from '../../lib/api';
import { apiFetch } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';

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
    <div className="min-h-screen bg-bg text-fg relative">
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{ background: 'radial-gradient(60% 50% at 50% 0%, rgb(124 108 242 / 0.12), transparent 70%)' }}
        aria-hidden
      />
      <div className="relative min-h-screen grid lg:grid-cols-2">
        <aside className="hidden lg:flex flex-col justify-between p-10 border-r border-line bg-sunk/40">
          <div className="flex items-center gap-2.5">
            <div
              className="w-11 h-11 rounded-xl grid place-items-center text-white shadow-tg"
              style={{ background: 'linear-gradient(140deg, #8B7CF7 0%, #2AABEE 100%)' }}
            >
              <Send size={18} strokeWidth={2.4} />
            </div>
            <div>
              <p className="font-bold text-lg leading-tight">EakPromosi</p>
              <p className="text-xs text-muted">Buat tenant baru dalam 1 menit</p>
            </div>
          </div>

          <div className="max-w-sm">
            <h2 className="text-2xl font-bold tracking-tight mb-3">Mulai gratis — paket Free selama 30 hari.</h2>
            <p className="text-sm text-muted mb-6">
              Satu tenant per organisasi, N anggota, dengan role owner/admin/operator/viewer. Upgrade kapan saja via
              Pakasir.
            </p>
            <ul className="space-y-2.5 text-sm">
              {[
                '1 akun Telegram userbot',
                'Auto Discovery dasar',
                'Broadcast ringan dengan batas aman',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-ok flex-none mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-muted">Subscription only · tanpa wallet, tanpa top-up credit.</p>
        </aside>

        <main className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md">
            <div className="flex items-center gap-2.5 mb-6 lg:hidden">
              <div
                className="w-10 h-10 rounded-xl grid place-items-center text-white shadow-tg"
                style={{ background: 'linear-gradient(140deg, #8B7CF7 0%, #2AABEE 100%)' }}
              >
                <Send size={18} strokeWidth={2.4} />
              </div>
              <div>
                <p className="font-bold text-base leading-tight">EakPromosi</p>
                <p className="text-[11.5px] text-muted">Daftar gratis</p>
              </div>
            </div>

            <Card>
              <CardBody className="p-6 md:p-7">
                <h1 className="text-xl font-bold tracking-tight mb-1">Buat akun</h1>
                <p className="text-sm text-muted mb-6">Tenant pertama otomatis mendapat paket Free (30 hari).</p>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setErr(null);
                    register.mutate(form);
                  }}
                >
                  <Field label="Nama tenant / organisasi">
                    <Input
                      value={form.tenantName}
                      onChange={(e) => setForm({ ...form, tenantName: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Nama Anda">
                    <Input
                      value={form.displayName}
                      onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Password" hint="Minimal 10 karakter">
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                    />
                  </Field>
                  {err ? <Alert tone="bad" title={err} /> : null}
                  <Button type="submit" variant="primary" className="w-full" loading={register.isPending}>
                    Daftar gratis <ArrowRight size={14} />
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
        </main>
      </div>
    </div>
  );
}
