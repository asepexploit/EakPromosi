import type { ApiErrorBody } from '@eak/shared';

import { useAuthStore } from '../stores/auth';

const DEFAULT_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiRequestInit extends Omit<RequestInit, 'body'> {
  json?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
}

/** Minimal fetch wrapper: envelope unwrapping, CSRF header, tenant header, error mapping. */
export async function apiFetch<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const base = DEFAULT_BASE.replace(/\/$/, '');
  const url = new URL(path.startsWith('/') ? `${base}${path}` : `${base}/${path}`);
  if (init.query) {
    for (const [k, v] of Object.entries(init.query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  const auth = useAuthStore.getState();
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set('content-type', 'application/json');
  headers.set('accept', 'application/json');
  if (auth.csrfToken) headers.set('x-csrf-token', auth.csrfToken);
  if (auth.activeTenantId) headers.set('x-tenant-id', auth.activeTenantId);

  const res = await fetch(url.toString(), {
    ...init,
    headers,
    credentials: 'include',
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const body: unknown = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const err = (body as ApiErrorBody | undefined)?.error;
    if (res.status === 401) {
      // Session expired → force sign-out so the SPA re-routes to /login
      auth.clear();
    }
    throw new ApiError(res.status, err?.code ?? 'HTTP_ERROR', err?.message ?? res.statusText, err?.details);
  }

  const envelope = body as { data: T } | undefined;
  return (envelope?.data ?? (body as T));
}
