import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { PlanLimitModal } from './PlanLimitModal';
import type { ApiError } from '../../lib/api';

interface PlanLimitApi {
  /** Open the upgrade modal programmatically. Returns true if the error was a plan limit (402). */
  handleError: (err: unknown) => boolean;
  show: (code?: string, message?: string) => void;
}

const Ctx = createContext<PlanLimitApi | null>(null);

interface State {
  open: boolean;
  code?: string | undefined;
  message?: string | undefined;
}

export function PlanLimitProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, setState] = useState<State>({ open: false });

  const show = useCallback((code?: string, message?: string) => {
    setState({ open: true, code, message });
  }, []);

  const handleError = useCallback(
    (err: unknown): boolean => {
      if (!err || typeof err !== 'object') return false;
      const e = err as ApiError;
      if (e.status === 402 || (typeof e.code === 'string' && e.code.startsWith('PLAN_'))) {
        show(e.code, e.message);
        return true;
      }
      return false;
    },
    [show],
  );

  const api = useMemo<PlanLimitApi>(() => ({ handleError, show }), [handleError, show]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <PlanLimitModal
        open={state.open}
        onOpenChange={(open) => setState((s) => ({ ...s, open }))}
        {...(state.code !== undefined ? { code: state.code } : {})}
        {...(state.message !== undefined ? { message: state.message } : {})}
      />
    </Ctx.Provider>
  );
}

export function usePlanLimit(): PlanLimitApi {
  const api = useContext(Ctx);
  if (!api) throw new Error('usePlanLimit must be used within PlanLimitProvider');
  return api;
}
