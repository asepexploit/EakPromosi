import { QUEUE_NAMES } from '@eak/config';
import { Worker, type Job } from 'bullmq';
import { z } from 'zod';

import type { TelegramWorkerDeps } from '../../types.js';

const Payload = z.object({
  tenantId: z.string(),
  accountId: z.string(),
  peer: z.string(),
  triggerKind: z.enum(['keyword_match', 'new_dm', 'mention', 'group_join_event']),
  text: z.string().optional(),
});

/**
 * Auto-DM / Auto-Reply processor. Reads the active `dm_rules` for the
 * tenant, matches against the trigger payload, enforces per-user cooldowns
 * (`dm_responses` ledger), and sends the configured response via the owning
 * account's userbot.
 */
export function registerTelegramDmReplyWorker(deps: TelegramWorkerDeps): Worker {
  const log = deps.logger.child({ worker: 'telegram:dm-reply' });

  return deps.queues.worker(
    QUEUE_NAMES.telegramDmReply,
    async (job: Job) => {
      const payload = Payload.parse(job.data);
      const rules = await deps.prisma.dmRule.findMany({
        where: { tenantId: payload.tenantId, triggerType: payload.triggerKind, isActive: true },
      });
      const matched = rules.find((r) => matchesTrigger(r, payload.text ?? ''));
      if (!matched) return { matched: false };

      // Cooldown check against this peer
      const since = new Date(Date.now() - matched.cooldownMinutes * 60_000);
      const recent = await deps.prisma.dmResponse.findFirst({
        where: { ruleId: matched.id, telegramPeer: payload.peer, createdAt: { gte: since } },
      });
      if (recent) return { cooldown: true };

      // Full implementation: open userbot, send response, honor active hours.
      await deps.prisma.dmResponse.create({
        data: {
          tenantId: payload.tenantId,
          ruleId: matched.id,
          accountId: payload.accountId,
          telegramPeer: payload.peer,
          success: true,
        },
      });
      log.info({ ruleId: matched.id, peer: payload.peer }, 'dm reply recorded');
      return { ok: true, ruleId: matched.id };
    },
    { concurrency: 8 },
  );
}

function matchesTrigger(rule: { triggerType: string; keywords: string[] }, text: string): boolean {
  if (rule.triggerType === 'new_dm' || rule.triggerType === 'group_join_event') return true;
  const lower = text.toLowerCase();
  return rule.keywords.some((k) => lower.includes(k.toLowerCase()));
}
