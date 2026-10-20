import type { SessionBundle } from '@eak/shared';
import { create } from 'zustand';

interface AuthState {
  loaded: boolean;
  user: SessionBundle['user'] | null;
  tenants: SessionBundle['tenants'];
  activeTenantId: string | null;
  csrfToken: string;
  setBundle: (bundle: SessionBundle) => void;
  clear: () => void;
  setActiveTenant: (tenantId: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  loaded: false,
  user: null,
  tenants: [],
  activeTenantId: null,
  csrfToken: '',
  setBundle: (bundle) =>
    set({
      loaded: true,
      user: bundle.user,
      tenants: bundle.tenants,
      activeTenantId: bundle.activeTenantId,
      csrfToken: bundle.csrfToken,
    }),
  clear: () =>
    set({
      loaded: true,
      user: null,
      tenants: [],
      activeTenantId: null,
      csrfToken: '',
    }),
  setActiveTenant: (tenantId) => set({ activeTenantId: tenantId }),
}));
