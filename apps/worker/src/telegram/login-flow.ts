import type { Redis } from 'ioredis';

/**
 * Pending-login state lives in Redis so the API can push the phone code
 * and 2FA password while the worker's `start()` callbacks block waiting.
 *
 * Key layout:
 *   eak:login:<loginId>:code       — code sent by user (TTL 5 min)
 *   eak:login:<loginId>:password   — 2FA password (TTL 5 min)
 *   eak:login:<loginId>:status     — JSON status payload for the SPA
 */
const TTL_SEC = 300;

/**
 * The payload persisted at `eak:login:<id>:status`. The API serves this to
 * the SPA so the UI can surface errors instead of spinning forever.
 */
export interface LoginStatus {
  stage: 'connecting' | 'code_sent' | 'password_required' | 'completed' | 'failed';
  /** Stable error code when stage=failed (e.g. PHONE_CODE_INVALID). */
  errorCode?: string;
  /** User-facing message when stage=failed. */
  message?: string;
  /** True if the user can meaningfully retry — enables the retry CTA. */
  retryable?: boolean;
  /** Monotonic timestamp so clients can detect staleness. */
  at: number;
}

export class LoginFlow {
  constructor(private readonly redis: Redis) {}

  async pushCode(loginId: string, code: string): Promise<void> {
    await this.redis.set(`eak:login:${loginId}:code`, code, 'EX', TTL_SEC);
  }

  async pushPassword(loginId: string, password: string): Promise<void> {
    await this.redis.set(`eak:login:${loginId}:password`, password, 'EX', TTL_SEC);
  }

  async waitCode(loginId: string, tenantId: string, timeoutMs = 180_000): Promise<string> {
    return this.poll(loginId, tenantId, `eak:login:${loginId}:code`, timeoutMs);
  }

  async waitPassword(loginId: string, tenantId: string, timeoutMs = 180_000): Promise<string> {
    return this.poll(loginId, tenantId, `eak:login:${loginId}:password`, timeoutMs);
  }

  /**
   * Mark `loginId` as the sole active attempt for a tenant. Any previously
   * active loginId is implicitly canceled — its waitCode/waitPassword will
   * throw "canceled by newer attempt" instead of silently returning an empty
   * string that GramJS then surfaces as "Code is empty".
   */
  async setActive(tenantId: string, loginId: string): Promise<void> {
    await this.redis.set(`eak:login:active:${tenantId}`, loginId, 'EX', TTL_SEC);
  }

  async getActive(tenantId: string): Promise<string | null> {
    return this.redis.get(`eak:login:active:${tenantId}`);
  }

  async isActive(tenantId: string, loginId: string): Promise<boolean> {
    const active = await this.getActive(tenantId);
    // If nothing is set, assume active (first run after a Redis flush).
    return active === null || active === loginId;
  }

  /**
   * Explicitly release the active-login claim for a tenant when it belongs to
   * `loginId`. Idempotent — a mismatch (someone else already claimed it) is a
   * no-op so a late cancel never clobbers a fresh attempt.
   */
  async clearActive(tenantId: string, loginId: string): Promise<void> {
    const active = await this.redis.get(`eak:login:active:${tenantId}`);
    if (active && active === loginId) {
      await this.redis.del(`eak:login:active:${tenantId}`);
    }
  }

  /**
   * Wipe the pending phoneCode / password entries for `loginId`. Called by
   * cancelLogin so a stale value cannot feed GramJS after the attempt is dead.
   */
  async clearPending(loginId: string): Promise<void> {
    await this.redis.del(`eak:login:${loginId}:code`, `eak:login:${loginId}:password`);
  }

  async setStatus(
    loginId: string,
    tenantId: string,
    stage: LoginStatus['stage'],
    extra?: { errorCode?: string; message?: string; retryable?: boolean },
  ): Promise<void> {
    const payload: LoginStatus = { stage, at: Date.now(), ...(extra ?? {}) };
    const serialized = JSON.stringify(payload);
    await this.redis.set(`eak:login:${loginId}:status`, serialized, 'EX', TTL_SEC);
    await this.redis.publish(
      `eak:live:${tenantId}`,
      JSON.stringify({ kind: 'auth_status', loginId, ...payload }),
    );
  }

  async getStatus(loginId: string): Promise<LoginStatus | null> {
    const raw = await this.redis.get(`eak:login:${loginId}:status`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LoginStatus;
    } catch {
      // Backwards-compat for the old plain-string format.
      return { stage: raw as LoginStatus['stage'], at: 0 };
    }
  }

  /**
   * Poll a Redis key until it has a value, times out, OR another startLogin
   * for the same tenant takes over. The "takeover" case is critical: without
   * it, a stale worker's waitCode will race the fresh one and GramJS throws
   * "Code is empty" when its callback resolves with the deleted value.
   */
  private async poll(loginId: string, tenantId: string, key: string, timeoutMs: number): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const v = await this.redis.get(key);
      if (v) {
        await this.redis.del(key);
        return v;
      }
      const active = await this.redis.get(`eak:login:active:${tenantId}`);
      if (active && active !== loginId) {
        throw new Error('login flow canceled by newer attempt');
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error(`login flow timeout on ${key}`);
  }
}
