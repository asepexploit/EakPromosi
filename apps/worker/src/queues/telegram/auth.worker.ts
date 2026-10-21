import { createHash } from 'node:crypto';

import { QUEUE_NAMES, encryptAesGcm } from '@eak/config';
import { TelegramAccountStatus } from '@eak/db';
import type { Worker} from 'bullmq';
import { type Job } from 'bullmq';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { z } from 'zod';

import { translateTelegramError } from '../../telegram/error-translate.js';
import { LoginFlow } from '../../telegram/login-flow.js';
import type { TelegramWorkerDeps } from '../../types.js';

const Payload = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('start'), tenantId: z.string(), loginId: z.string(), phone: z.string(), requestedBy: z.string() }),
  // Legacy `verify` jobs are no-ops now — API writes code/password straight to
  // Redis (see AccountsService.verifyCode). Kept here only so BullMQ instances
  // mid-restart with queued verify payloads don't crash with a parse error.
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
      // Legacy BullMQ path — API currently writes straight to Redis. Kept so a
      // worker started mid-rolling-restart with a queued verify-job doesn't
      // crash on parse. Push into Redis for the (rare) case it still fires.
      log.info({ loginId: payload.loginId }, 'login verify (legacy queue path)');
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
    // GramJS logs _updateLoop TIMEOUT at warn-level during normal operation
    // (every ~60s of idleness). It clutters dev logs and users reading them
    // mistake it for a real error, so silence anything below ERROR here. The
    // important Telegram errors still surface because they're thrown, not logged.
    client.setLogLevel('error' as never);

    try {
      // Mark this attempt as the active one for the tenant — stale start-jobs
      // from prior attempts will see active != them and abort their waitCode
      // loop with "canceled by newer attempt" instead of racing us.
      await flow.setActive(payload.tenantId, payload.loginId);
      await flow.setStatus(payload.loginId, payload.tenantId, 'connecting');
      log.info({ loginId: payload.loginId, tenantId: payload.tenantId }, 'login stage=connecting');
      await client.start({
        phoneNumber: async () => payload.phone,
        phoneCode: async () => {
          await flow.setStatus(payload.loginId, payload.tenantId, 'code_sent');
          log.info({ loginId: payload.loginId }, 'login stage=code_sent (waiting for user)');
          return flow.waitCode(payload.loginId, payload.tenantId);
        },
        password: async () => {
          await flow.setStatus(payload.loginId, payload.tenantId, 'password_required');
          log.info({ loginId: payload.loginId }, 'login stage=password_required (waiting for user)');
          return flow.waitPassword(payload.loginId, payload.tenantId);
        },
        onError: async (err) => {
          const t = translateTelegramError(err);
          log.error({ err, loginId: payload.loginId, code: t.code }, 'login onError → failed');
          await flow.setStatus(payload.loginId, payload.tenantId, 'failed', {
            errorCode: t.code,
            message: t.message,
            retryable: t.retryable,
          });
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
      // Release the active-login claim now that we're done so an immediate
      // retry/add-another doesn't inherit a stale slot.
      await flow.clearActive(payload.tenantId, payload.loginId);
      log.info({ loginId: payload.loginId, telegramUserId: String(me.id) }, 'login stage=completed');
      return { ok: true, status: 'completed' };
    } catch (err) {
      const existing = await flow.getStatus(payload.loginId);
      // If onError already pushed a `failed` status, keep that richer message —
      // the exception bubbling after it is the same event in another costume.
      if (existing?.stage !== 'failed') {
        const t = translateTelegramError(err);
        log.error({ err, loginId: payload.loginId, code: t.code }, 'login catch → failed');
        await flow.setStatus(payload.loginId, payload.tenantId, 'failed', {
          errorCode: t.code,
          message: t.message,
          retryable: t.retryable,
        });
      } else {
        log.warn({ loginId: payload.loginId, code: existing.errorCode }, 'login catch (already failed by onError)');
      }
      // Release only if we still own it (user cancel already deleted it, in which case this is a no-op).
      await flow.clearActive(payload.tenantId, payload.loginId);
      throw err;
    } finally {
      await client.disconnect().catch(() => undefined);
    }
  });
}
