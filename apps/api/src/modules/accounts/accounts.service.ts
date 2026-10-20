import { AppError, QUEUE_NAMES, encryptAesGcm, type EncryptionKey, type QueueFactory } from '@eak/config';
import { type PrismaClient, TelegramAccountStatus } from '@eak/db';
import type { StartAccountLogin, VerifyAccountCode } from '@eak/shared';

import { AuditService } from '../../lib/audit-service.js';
import { PlanService } from '../../lib/plan-service.js';

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
  ) {}

  async list(tenantId: string): Promise<Array<Record<string, unknown>>> {
    const rows = await this.prisma.telegramAccount.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async startLogin(tenantId: string, actorUserId: string, input: StartAccountLogin): Promise<{ loginId: string }> {
    await this.plans.enforce(tenantId, { kind: 'add_account' });

    const loginId = `tglogin_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
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
    await this.queues.queue(QUEUE_NAMES.telegramAuth).add(
      'telegram.auth.verify',
      {
        kind: 'verify',
        tenantId,
        loginId: input.loginId,
        code: input.code,
        password: input.password ?? null,
        requestedBy: actorUserId,
      },
      { jobId: `auth-verify:${input.loginId}`, removeOnComplete: true },
    );
    await this.audit.log({
      tenantId,
      actorUserId,
      action: 'telegram_account.login.verify',
      resource: 'telegram_account',
      resourceId: input.loginId,
    });
    return { status: 'queued' };
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

  private toDto(r: { [key: string]: unknown } & { id: string; createdAt: Date }): Record<string, unknown> {
    const row = r as unknown as {
      id: string;
      displayName: string;
      username: string | null;
      phoneLast4: string;
      telegramUserId: string | null;
      status: TelegramAccountStatus;
      capabilities: string[];
      disabledByPlanLimit: boolean;
      floodWaitUntil: Date | null;
      lastError: string | null;
      createdAt: Date;
    };
    return {
      id: row.id,
      displayName: row.displayName,
      username: row.username,
      phoneMasked: `+•• ${row.phoneLast4}`,
      telegramUserId: row.telegramUserId ?? '',
      status: row.status,
      capabilities: row.capabilities,
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
  return require('node:crypto').createHash('sha256').update(phone).digest('hex');
}
