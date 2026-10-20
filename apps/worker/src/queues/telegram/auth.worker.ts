import { QUEUE_NAMES, encryptAesGcm } from '@eak/config';
import { TelegramAccountStatus } from '@eak/db';
import { createHash } from 'node:crypto';
import { Worker, type Job } from 'bullmq';
import { StringSession } from 'telegram/sessions/index.js';
import { TelegramClient } from 'telegram';
import { z } from 'zod';

import { LoginFlow } from '../../telegram/login-flow.js';
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
 * MTProto login worker.
 *
 * Flow:
 *   start (job):  open a TelegramClient and call `start()` with callbacks that
 *                 pull the phoneCode / password from Redis (LoginFlow). The
 *                 start() promise suspends until the user POSTs the code via
 *                 the API (which fires a verify job that just pushes into
 *                 Redis — no second TelegramClient).
 *   verify (job): write the code (and optional password) into Redis so the
 *                 blocking start() callback resolves. The start job then
 *                 completes, encrypts the session string, and upserts
 *                 telegram_accounts.
 */
export function registerTelegramAuthWorker(deps: TelegramWorkerDeps): Worker {
  const log = deps.logger.child({ worker: 'telegram:auth' });
  const flow = new LoginFlow(deps.redis);

  return deps.queues.worker(QUEUE_NAMES.telegramAuth, async (job: Job) => {
    const payload = Payload.parse(job.data);
    log.info({ jobId: job.id, kind: payload.kind, tenantId: payload.tenantId }, 'auth job');

    if (payload.kind === 'verify') {
      // Dispatch code + optional password to the pending start() blocking on Redis.
      await flow.pushCode(payload.loginId, payload.code);
      if (payload.password) await flow.pushPassword(payload.loginId, payload.password);
      return { ok: true, status: 'verify_dispatched' };
    }

    const key = deps.encryptionKeys[0];
    if (!key) throw new Error('missing encryption key');

    const client = new TelegramClient(new StringSession(''), deps.env.TELEGRAM_API_ID, deps.env.TELEGRAM_API_HASH, {
      connectionRetries: 3,
      deviceModel: `EakPromosi/${payload.loginId.slice(0, 6)}`,
      systemVersion: 'Linux x86_64',
      appVersion: '1.0.0',
      useWSS: true,
    });

    try {
      await flow.setStatus(payload.loginId, payload.tenantId, 'connecting');
      await client.start({
        phoneNumber: async () => payload.phone,
        phoneCode: async () => {
          await flow.setStatus(payload.loginId, payload.tenantId, 'code_sent');
          return flow.waitCode(payload.loginId);
        },
        password: async () => {
          await flow.setStatus(payload.loginId, payload.tenantId, 'password_required');
          return flow.waitPassword(payload.loginId);
        },
        onError: async (err) => {
          log.error({ err, loginId: payload.loginId }, 'login error');
          return true; // stop retrying
        },
      });

      const me = await client.getMe();
      const sessionString = (client.session as StringSession).save() ?? '';
      const sessionCipher = encryptAesGcm(sessionString, key);
      const phoneHash = createHash('sha256').update(payload.phone).digest('hex');

      await deps.prisma.telegramAccount.upsert({
        where: { tenantId_telegramUserId: { tenantId: payload.tenantId, telegramUserId: String(me.id) } },
        update: {
          sessionCipher,
          sessionKeyVersion: key.version,
          status: TelegramAccountStatus.warming,
          warmupStartedAt: new Date(),
          displayName: me.firstName ?? me.username ?? 'Unnamed',
          username: me.username ?? null,
        },
        create: {
          tenantId: payload.tenantId,
          telegramUserId: String(me.id),
          phoneLast4: payload.phone.slice(-4),
          phoneHash,
          displayName: me.firstName ?? me.username ?? 'Unnamed',
          username: me.username ?? null,
          deviceModel: `EakPromosi/${payload.loginId.slice(0, 6)}`,
          systemVersion: 'Linux x86_64',
          appVersion: '1.0.0',
          status: TelegramAccountStatus.warming,
          sessionCipher,
          sessionKeyVersion: key.version,
          warmupStartedAt: new Date(),
        },
      });
      await flow.setStatus(payload.loginId, payload.tenantId, 'completed');
      log.info({ loginId: payload.loginId, telegramUserId: String(me.id) }, 'login completed');
      return { ok: true, status: 'completed' };
    } catch (err) {
      log.error({ err, loginId: payload.loginId }, 'login failed');
      await flow.setStatus(payload.loginId, payload.tenantId, 'failed');
      throw err;
    } finally {
      await client.disconnect().catch(() => undefined);
    }
  });
}
