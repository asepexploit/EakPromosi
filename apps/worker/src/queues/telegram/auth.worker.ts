import { QUEUE_NAMES, encryptAesGcm } from '@eak/config';
import { TelegramAccountStatus } from '@eak/db';
import { Worker, type Job } from 'bullmq';
import { z } from 'zod';

import type { TelegramWorkerDeps } from '../../types.js';

const Payload = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('start'), tenantId: z.string(), loginId: z.string(), phone: z.string(), requestedBy: z.string() }),
  z.object({
    kind: z.literal('verify'),
    tenantId: z.string(),
    loginId: z.string(),
    code: z.string(),
    password: z.string().nullable(),
    requestedBy: z.string(),
  }),
]);
type Payload = z.infer<typeof Payload>;

/**
 * MTProto login worker (scaffolded).
 *
 * Full flow (deferred until a live MTProto environment is wired):
 *   start:   TelegramClient.start({ phoneNumber, phoneCode: fn, password: fn })
 *            stashes a resolver in Redis keyed by loginId; publishes
 *            `code_sent` so the UI can prompt for the code.
 *   verify:  resolves the pending `phoneCode` / `password` → the start() call
 *            completes, we encrypt the session string, upsert telegram_accounts.
 *
 * The stub below publishes status so the UI round-trips end-to-end.
 */
export function registerTelegramAuthWorker(deps: TelegramWorkerDeps): Worker {
  const log = deps.logger.child({ worker: 'telegram:auth' });

  return deps.queues.worker(QUEUE_NAMES.telegramAuth, async (job: Job) => {
    const payload = Payload.parse(job.data);
    log.info({ jobId: job.id, kind: payload.kind, tenantId: payload.tenantId }, 'auth job');

    if (payload.kind === 'start') {
      await deps.redis.publish(
        `eak:live:${payload.tenantId}`,
        JSON.stringify({ kind: 'auth_status', loginId: payload.loginId, status: 'code_sent' }),
      );
      return { ok: true, loginId: payload.loginId, status: 'code_sent' };
    }

    const key = deps.encryptionKeys[0];
    if (!key) throw new Error('missing encryption key');
    const stubSession = encryptAesGcm(`stub-session-${payload.loginId}`, key);
    await deps.prisma.telegramAccount.upsert({
      where: { tenantId_telegramUserId: { tenantId: payload.tenantId, telegramUserId: `stub-${payload.loginId}` } },
      update: { status: TelegramAccountStatus.disconnected, sessionCipher: stubSession, sessionKeyVersion: key.version },
      create: {
        tenantId: payload.tenantId,
        telegramUserId: `stub-${payload.loginId}`,
        phoneLast4: '0000',
        phoneHash: 'stub',
        displayName: `Pending login ${payload.loginId}`,
        deviceModel: 'EakPromosi/1.0',
        systemVersion: 'Linux x86_64',
        appVersion: '1.0.0',
        status: TelegramAccountStatus.disconnected,
        sessionCipher: stubSession,
        sessionKeyVersion: key.version,
      },
    });
    log.warn({ loginId: payload.loginId }, 'auth worker ran in stub mode — wire TelegramClient to finish login');
    return { ok: true, status: 'completed' };
  });
}
