import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import { Button } from './Button';
import { Dialog } from './Dialog';

interface ConfirmOpts {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

type Resolver = (value: boolean) => void;

interface ConfirmApi {
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
}

const Ctx = createContext<ConfirmApi | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, setState] = useState<ConfirmOpts | null>(null);
  const resolverRef = useRef<Resolver | null>(null);

  const confirm = useCallback((opts: ConfirmOpts): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState(opts);
    });
  }, []);

  const close = (value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setState(null);
  };

  const api = useMemo<ConfirmApi>(() => ({ confirm }), [confirm]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <Dialog
        open={!!state}
        onOpenChange={(open) => {
          if (!open) close(false);
        }}
        title={state?.title ?? ''}
        {...(state?.description ? { description: state.description } : {})}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>
              {state?.cancelLabel ?? 'Batal'}
            </Button>
            <Button
              variant={state?.tone === 'danger' ? 'danger-solid' : 'primary'}
              onClick={() => close(true)}
              autoFocus
            >
              {state?.confirmLabel ?? 'Konfirmasi'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">Tindakan ini akan segera diterapkan.</p>
      </Dialog>
    </Ctx.Provider>
  );
}

export function useConfirm(): ConfirmApi {
  const api = useContext(Ctx);
  if (!api) throw new Error('useConfirm must be used within ConfirmProvider');
  return api;
}
