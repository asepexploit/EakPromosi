import * as RadixToast from '@radix-ui/react-toast';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { cn } from '../../lib/cn';

type Tone = 'success' | 'error' | 'info' | 'warn';

interface ToastInput {
  title: string;
  description?: string;
  tone?: Tone;
  durationMs?: number;
}

interface ToastEntry extends Required<Omit<ToastInput, 'description'>> {
  id: number;
  description?: string;
}

interface ToastApi {
  push: (input: ToastInput) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warn: (title: string, description?: string) => void;
}

const Ctx = createContext<ToastApi | null>(null);

const TONE_META: Record<Tone, { ring: string; iconBg: string; Icon: typeof Info }> = {
  success: { ring: 'ring-ok/40', iconBg: 'bg-ok/10 text-ok', Icon: CheckCircle2 },
  error: { ring: 'ring-bad/40', iconBg: 'bg-bad/10 text-bad', Icon: AlertCircle },
  info: { ring: 'ring-tg/40', iconBg: 'bg-tg/10 text-tg-ink', Icon: Info },
  warn: { ring: 'ring-warn/40', iconBg: 'bg-warn/10 text-warn', Icon: AlertTriangle },
};

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const push = useCallback((input: ToastInput) => {
    const id = Date.now() + Math.random();
    const entry: ToastEntry = {
      id,
      title: input.title,
      tone: input.tone ?? 'info',
      durationMs: input.durationMs ?? 4500,
    };
    if (input.description !== undefined) entry.description = input.description;
    setToasts((prev) => [...prev, entry]);
  }, []);

  const toastWithTone = useCallback(
    (tone: Tone) =>
      (title: string, description?: string): void => {
        const input: ToastInput = { title, tone };
        if (description !== undefined) input.description = description;
        push(input);
      },
    [push],
  );

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: toastWithTone('success'),
      error: toastWithTone('error'),
      info: toastWithTone('info'),
      warn: toastWithTone('warn'),
    }),
    [push, toastWithTone],
  );

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <Ctx.Provider value={api}>
      <RadixToast.Provider swipeDirection="right">
        {children}
        {toasts.map((t) => {
          const { ring, iconBg, Icon } = TONE_META[t.tone];
          return (
            <RadixToast.Root
              key={t.id}
              duration={t.durationMs}
              onOpenChange={(open) => {
                if (!open) remove(t.id);
              }}
              className={cn(
                'bg-panel border border-line rounded-xl shadow-pop ring-1 px-3.5 py-3 flex items-start gap-3 min-w-[280px] max-w-[380px]',
                'data-[state=open]:animate-fade-up data-[state=closed]:opacity-0 transition-opacity',
                ring,
              )}
            >
              <div className={cn('w-8 h-8 rounded-lg grid place-items-center flex-none', iconBg)}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <RadixToast.Title className="text-sm font-semibold leading-tight">{t.title}</RadixToast.Title>
                {t.description ? (
                  <RadixToast.Description className="text-xs text-muted mt-0.5 leading-relaxed">
                    {t.description}
                  </RadixToast.Description>
                ) : null}
              </div>
              <RadixToast.Close
                aria-label="Tutup"
                className="text-muted hover:text-fg transition-colors flex-none mt-0.5"
              >
                <X size={14} />
              </RadixToast.Close>
            </RadixToast.Root>
          );
        })}
        <RadixToast.Viewport className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 outline-none max-w-[calc(100vw-2.5rem)]" />
      </RadixToast.Provider>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(Ctx);
  if (!api) throw new Error('useToast must be used within ToastProvider');
  return api;
}
