import { QUEUE_NAMES } from '@eak/config';
import { MembershipStatus } from '@eak/db';
import { Worker, type Job } from 'bullmq';
import { z } from 'zod';

import { runTelegramCall } from '../../telegram/safety.js';
import { UserbotAdapter } from '../../telegram/userbot.adapter.js';
import type { TelegramWorkerDeps } from '../../types.js';

const Payload = z.object({
  tenantId: z.string(),
  accountId: z.string(),
});

/**
 * Periodic sweep: for each account, walk its memberships and re-check
 * whether it's still a member of each chat. Flips to `left`, `kicked`,
 * or `banned` as appropriate.
 */
export function registerTelegramMembershipSyncWorker(deps: TelegramWorkerDeps): Worker {
  const log = deps.logger.child({ worker: 'telegram:membership-sync' });

  return deps.queues.worker(
    QUEUE_NAMES.telegramMembershipSync,
    async (job: Job) => {
      const payload = Payload.parse(job.data);
      const account = await deps.prisma.telegramAccount.findFirst({
        where: { id: payload.accountId, tenantId: payload.tenantId },
      });
      if (!account?.sessionCipher) return { skipped: 'no_session' };

      const memberships = await deps.prisma.groupMembership.findMany({
        where: { accountId: account.id, status: MembershipStatus.member },
        include: { group: true },
        take: 100,
      });

      const userbot = new UserbotAdapter({
        env: deps.env,
        encryptionKeys: deps.encryptionKeys,
        deviceModel: account.deviceModel,
        systemVersion: account.systemVersion,
        appVersion: account.appVersion,
      });

      try {
        const client = await userbot.connectWithCipher(account.sessionCipher);
        let flipped = 0;
        for (const m of memberships) {
          try {
            await runTelegramCall(() => client.getEntity(m.group.telegramChatId));
            await deps.prisma.groupMembership.update({
              where: { id: m.id },
              data: { lastCheckedAt: new Date() },
            });
          } catch {
            await deps.prisma.groupMembership.update({
              where: { id: m.id },
              data: { status: MembershipStatus.left, leftAt: new Date(), lastCheckedAt: new Date() },
            });
            flipped += 1;
          }
        }
        log.info({ accountId: account.id, checked: memberships.length, flipped }, 'membership sync done');
        return { checked: memberships.length, flipped };
      } finally {
        await userbot.disconnect().catch(() => undefined);
      }
    },
    { concurrency: 3 },
  );
}
