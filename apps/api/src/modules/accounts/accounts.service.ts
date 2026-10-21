import { createHash } from 'node:crypto';

import { AppError, QUEUE_NAMES, encryptAesGcm, type EncryptionKey, type QueueFactory } from '@eak/config';
import { type PrismaClient, TelegramAccountStatus } from '@eak/db';
import type { AccountLoginStatus, StartAccountLogin, TelegramAccount, VerifyAccountCode } from '@eak/shared';
import type { Redis } from 'ioredis';

import type { AuditService } from '../../lib/audit-service.js';
import type { PlanService } from '../../lib/plan-service.js';

/**
 * MTProto login is a 3-step dance (phone → code → 2FA). The API doesn't
 * speak MTProto directly — it enqueues a `telegram:auth` job and the worker
 * replies via Redis pub/sub + stores progress in `telegram_accounts` /
 * cache. For this layer we expose idempotent endpoints keyed by `loginId`.
 */
export class AccountsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly queues: QueueFactory,
    private readonly audit: AuditService,
    private readonly plans: PlanService,
    private readonly encryptionKeys: EncryptionKey[],
    private readonly redis: Redis,
  ) {}

  /**
   * Mirror of `apps/worker/src/telegram/login-flow.ts` — kept read-only here
   * so the API layer doesn't need to depend on the worker package. Keys and
   * payload shape MUST stay in sync with that file.
   */
  async getLoginStatus(loginId: string): Promise<AccountLoginStatus> {
    const raw = await this.redis.get(`eak:login:${loginId}:status`);
    if (!raw) return { stage: 'pending', at: 0 };
    try {
      const parsed = JSON.parse(raw) as AccountLoginStatus;
      // Guard: Redis may hold the legacy plain-string format left over from
      // a worker running an older image during a rolling restart.
      if (typeof parsed === 'object' && parsed && 'stage' in parsed) return parsed;
    } catch {
      // fallthrough to legacy string handling
    }
    return { stage: raw as AccountLoginStatus['stage'], at: 0 };
  }

  async list(tenantId: string): Promise<TelegramAccount[]> {
    const rows = await this.prisma.telegramAccount.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async startLogin(tenantId: string, actorUserId: string, input: StartAccountLogin): Promise<{ loginId: string }> {
    await this.plans.enforce(tenantId, { kind: 'add_account' });

    const loginId = `tglogin_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    // Immediately claim active-login for this tenant. The worker's poll loops
    // for any prior attempt will detect the mismatch within ~1s and bail out
    // instead of silently racing the new attempt and producing "Code is empty".
    await this.redis.set(`eak:login:active:${tenantId}`, loginId, 'EX', 300);
    await this.queues.queue(QUEUE_NAMES.telegramAuth).add(
      'telegram.auth.start',
      { kind: 'start', tenantId, loginId, phone: input.phone, requestedBy: actorUserId },
      { jobId: `auth:${loginId}`, removeOnComplete: true },
    );
    await this.audit.log({
      tenantId,
      actorUserId,
      action: 'telegram_account.login.start',
      resource: 'telegram_account',
      resourceId: loginId,
    });
    return { loginId };
  }

  async verifyCode(tenantId: string, actorUserId: string, input: VerifyAccountCode): Promise<{ status: string }> {
    // Push code + optional password DIRECTLY into Redis — fastest, deterministic.
    // The old impl queued a BullMQ job keyed by loginId which silently dropped
    // retries because jobId was unique per loginId. By skipping the queue we
    // can push a new code (e.g. user mistyped) without BullMQ dedup fighting us.
    await this.redis.set(`eak:login:${input.loginId}:code`, input.code, 'EX', 300);
    if (input.password) {
      await this.redis.set(`eak:login:${input.loginId}:password`, input.password, 'EX', 300);
    }
    await this.audit.log({
      tenantId,
      actorUserId,
      action: 'telegram_account.login.verify',
      resource: 'telegram_account',
      resourceId: input.loginId,
    });
    return { status: 'dispatched' };
  }

  /**
   * Idempotent cancel for a pending login attempt.
   *
   * Steps:
   *  1. Clear the active-login claim so the worker's `poll()` sees active!=loginId
   *     and exits waitCode/waitPassword with `canceled by newer attempt`.
   *  2. Wipe any pending phoneCode / password keys so GramJS never gets fed a
   *     stale value after we've declared the attempt dead.
   *  3. Write a terminal `failed` status with `AUTH_USER_CANCEL` so a status
   *     poll in-flight sees a clean error and can stop polling.
   *
   * Safe to call for a loginId that never existed — the keys simply don't exist
   * and all three ops are no-ops.
   */
  async cancelLogin(tenantId: string, actorUserId: string, loginId: string): Promise<void> {
    const activeKey = `eak:login:active:${tenantId}`;
    const active = await this.redis.get(activeKey);
    if (active && active === loginId) {
      await this.redis.del(activeKey);
    }
    await this.redis.del(`eak:login:${loginId}:code`, `eak:login:${loginId}:password`);
    const payload = {
      stage: 'failed' as const,
      errorCode: 'AUTH_USER_CANCEL',
      message: 'Login dibatalkan.',
      retryable: true,
      at: Date.now(),
    };
    await this.redis.set(`eak:login:${loginId}:status`, JSON.stringify(payload), 'EX', 300);
    await this.audit.log({
      tenantId,
      actorUserId,
      action: 'telegram_account.login.cancel',
      resource: 'telegram_account',
      resourceId: loginId,
    });
  }

  async disconnect(tenantId: string, actorUserId: string, accountId: string): Promise<void> {
    const row = await this.prisma.telegramAccount.findFirst({ where: { id: accountId, tenantId } });
    if (!row) throw new AppError('NOT_FOUND', 'Akun tidak ditemukan');
    await this.prisma.telegramAccount.update({
      where: { id: row.id },
      data: { status: TelegramAccountStatus.disconnected },
    });
    await this.audit.log({
      tenantId,
      actorUserId,
      action: 'telegram_account.disconnect',
      resource: 'telegram_account',
      resourceId: row.id,
    });
  }

  async delete(tenantId: string, actorUserId: string, accountId: string): Promise<void> {
    const row = await this.prisma.telegramAccount.findFirst({ where: { id: accountId, tenantId } });
    if (!row) throw new AppError('NOT_FOUND', 'Akun tidak ditemukan');
    await this.prisma.telegramAccount.delete({ where: { id: row.id } });
    await this.audit.log({
      tenantId,
      actorUserId,
      action: 'telegram_account.delete',
      resource: 'telegram_account',
      resourceId: row.id,
      severity: 'warn',
    });
  }

  /**
   * Called by the worker (through an internal RPC) once the login succeeds.
   * Kept here because it's the one place encryption of session strings
   * is done — single-responsibility for the cipher.
   */
  async persistCompletedLogin(input: {
    tenantId: string;
    telegramUserId: string;
    phone: string;
    sessionString: string;
    twoFaPassword: string | null;
    displayName: string;
    username: string | null;
  }): Promise<void> {
    const key = this.encryptionKeys[0];
    if (!key) throw new AppError('INTERNAL', 'no encryption key loaded');
    const sessionCipher = encryptAesGcm(input.sessionString, key);
    const twoFaCipher = input.twoFaPassword ? encryptAesGcm(input.twoFaPassword, key) : null;
    const last4 = input.phone.slice(-4);
    await this.prisma.telegramAccount.upsert({
      where: { tenantId_telegramUserId: { tenantId: input.tenantId, telegramUserId: input.telegramUserId } },
      update: {
        sessionCipher,
        sessionKeyVersion: key.version,
        twoFaCipher,
        status: TelegramAccountStatus.active,
        warmupStartedAt: new Date(),
      },
      create: {
        tenantId: input.tenantId,
        telegramUserId: input.telegramUserId,
        phoneLast4: last4,
        phoneHash: hashPhone(input.phone),
        displayName: input.displayName,
        username: input.username,
        sessionCipher,
        sessionKeyVersion: key.version,
        twoFaCipher,
        deviceModel: 'EakPromosi/1.0',
        systemVersion: 'Linux x86_64',
        appVersion: '1.0.0',
        status: TelegramAccountStatus.warming,
        warmupStartedAt: new Date(),
      },
    });
  }

  private toDto(row: {
    id: string;
    displayName: string;
    username: string | null;
    phoneLast4: string;
    telegramUserId: string | null;
    status: TelegramAccountStatus;
    capabilities: readonly string[];
    disabledByPlanLimit: boolean;
    floodWaitUntil: Date | null;
    lastError: string | null;
    createdAt: Date;
  }): TelegramAccount {
    return {
      id: row.id,
      displayName: row.displayName,
      username: row.username,
      phoneMasked: `+•• ${row.phoneLast4}`,
      telegramUserId: row.telegramUserId ?? '',
      status: row.status,
      capabilities: row.capabilities as TelegramAccount['capabilities'],
      disabledByPlanLimit: row.disabledByPlanLimit,
      floodWaitUntil: row.floodWaitUntil?.toISOString() ?? null,
      lastError: row.lastError,
      joinedGroupsCount: 0,
      sentToday: 0,
      lastActiveAt: null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

function hashPhone(phone: string): string {
  // non-reversible, used to detect duplicates without storing the number
  return createHash('sha256').update(phone).digest('hex');
}
