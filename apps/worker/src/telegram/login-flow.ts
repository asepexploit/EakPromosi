import type { Redis } from 'ioredis';

/**
 * Pending-login state lives in Redis so the API can push the phone code
 * and 2FA password while the worker's `start()` callbacks block waiting.
 *
 * Key layout:
 *   eak:login:<loginId>:code       — code sent by user (TTL 5 min)
 *   eak:login:<loginId>:password   — 2FA password (TTL 5 min)
 *   eak:login:<loginId>:status     — short status string for the SPA
 */
const TTL_SEC = 300;

export class LoginFlow {
  constructor(private readonly redis: Redis) {}

  async pushCode(loginId: string, code: string): Promise<void> {
    await this.redis.set(`eak:login:${loginId}:code`, code, 'EX', TTL_SEC);
  }

  async pushPassword(loginId: string, password: string): Promise<void> {
    await this.redis.set(`eak:login:${loginId}:password`, password, 'EX', TTL_SEC);
  }

  async waitCode(loginId: string, timeoutMs = 180_000): Promise<string> {
    return this.poll(`eak:login:${loginId}:code`, timeoutMs);
  }

  async waitPassword(loginId: string, timeoutMs = 180_000): Promise<string> {
    return this.poll(`eak:login:${loginId}:password`, timeoutMs);
  }

  async setStatus(loginId: string, tenantId: string, status: string): Promise<void> {
    await this.redis.set(`eak:login:${loginId}:status`, status, 'EX', TTL_SEC);
    await this.redis.publish(
      `eak:live:${tenantId}`,
      JSON.stringify({ kind: 'auth_status', loginId, status }),
    );
  }

  async getStatus(loginId: string): Promise<string | null> {
    return this.redis.get(`eak:login:${loginId}:status`);
  }

  private async poll(key: string, timeoutMs: number): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const v = await this.redis.get(key);
      if (v) {
        await this.redis.del(key);
        return v;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error(`login flow timeout on ${key}`);
  }
}
