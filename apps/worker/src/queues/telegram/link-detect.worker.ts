import { QUEUE_NAMES } from '@eak/config';
import { DiscoveredLinkKind, DiscoveredLinkStatus } from '@eak/db';
import type { Worker} from 'bullmq';
import { type Job } from 'bullmq';
import { z } from 'zod';

import { runTelegramCall } from '../../telegram/safety.js';
import { UserbotAdapter } from '../../telegram/userbot.adapter.js';
import type { TelegramWorkerDeps } from '../../types.js';

const Payload = z.object({
  tenantId: z.string(),
  sourceId: z.string(),
  triggeredBy: z.string(),
});

const PATTERNS = {
  publicUsername: /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/(?!\+)([a-zA-Z][a-zA-Z0-9_]{3,31})/g,
  privateInvite: /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/\+([A-Za-z0-9_-]{10,})/g,
  mention: /(?<![\w\d])@([a-zA-Z][a-zA-Z0-9_]{3,31})/g,
};

/**
 * Scans recent messages from a configured source with any of the tenant's
 * active discovery-capable accounts, extracts link candidates, and upserts
 * into `discovered_links` (unique by (tenant_id, normalized)).
 *
 * The actual userbot read is wrapped in runTelegramCall so flood-wait is
 * respected and the job reschedules itself cleanly.
 */
export function registerTelegramLinkDetectWorker(deps: TelegramWorkerDeps): Worker {
  const log = deps.logger.child({ worker: 'telegram:link-detect' });

  return deps.queues.worker(
    QUEUE_NAMES.telegramLinkDetect,
    async (job: Job) => {
      const payload = Payload.parse(job.data);
      const source = await deps.prisma.discoverySource.findFirst({
        where: { id: payload.sourceId, tenantId: payload.tenantId },
      });
      if (!source) return { skipped: 'source_not_found' };

      // Pick any active discovery-capable account for this tenant.
      const account = await deps.prisma.telegramAccount.findFirst({
        where: {
          tenantId: payload.tenantId,
          status: 'active',
          capabilities: { has: 'discovery' },
          sessionCipher: { not: null },
        },
      });
      if (!account?.sessionCipher) return { skipped: 'no_discovery_account' };

      const userbot = new UserbotAdapter({
        env: deps.env,
        encryptionKeys: deps.encryptionKeys,
        deviceModel: account.deviceModel,
        systemVersion: account.systemVersion,
        appVersion: account.appVersion,
      });

      try {
        await userbot.connectWithCipher(account.sessionCipher);
        const messages = await runTelegramCall(() =>
          userbot.getRecentMessages(source.telegramChatId, Math.min(source.dailyLimit, 100)),
        );
        const found = messages.flatMap((m) => extractLinks(m, source.mentionEnabled));
        for (const link of found) {
          await deps.prisma.discoveredLink.upsert({
            where: { tenantId_normalized: { tenantId: payload.tenantId, normalized: link.normalized } },
            update: { lastSeenAt: new Date() },
            create: {
              tenantId: payload.tenantId,
              sourceId: source.id,
              rawUrl: link.raw,
              normalized: link.normalized,
              kind: link.kind,
              status: DiscoveredLinkStatus.pending,
            },
          });
        }

        await deps.prisma.discoverySource.update({ where: { id: source.id }, data: { lastRunAt: new Date() } });
        log.info({ sourceId: source.id, scanned: messages.length, found: found.length }, 'discovery scan complete');
        return { scanned: messages.length, found: found.length };
      } finally {
        await userbot.disconnect().catch(() => undefined);
      }
    },
    { concurrency: 5 },
  );
}

export function extractLinks(text: string, allowMentions: boolean): Array<{ raw: string; normalized: string; kind: DiscoveredLinkKind }> {
  const out: Array<{ raw: string; normalized: string; kind: DiscoveredLinkKind }> = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(PATTERNS.privateInvite)) {
    const code = match[1];
    if (!code) continue;
    const normalized = `t.me/+${code}`;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push({ raw: match[0], normalized, kind: DiscoveredLinkKind.private_invite });
  }
  for (const match of text.matchAll(PATTERNS.publicUsername)) {
    const name = match[1];
    if (!name) continue;
    const normalized = `t.me/${name.toLowerCase()}`;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push({ raw: match[0], normalized, kind: DiscoveredLinkKind.public_username });
  }
  if (allowMentions) {
    for (const match of text.matchAll(PATTERNS.mention)) {
      const name = match[1];
      if (!name) continue;
      const normalized = `t.me/${name.toLowerCase()}`;
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      out.push({ raw: match[0], normalized, kind: DiscoveredLinkKind.public_mention });
    }
  }
  return out;
}
