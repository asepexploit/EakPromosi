import { QUEUE_NAMES } from '@eak/config';
import { DiscoveredLinkKind, DiscoveredLinkStatus } from '@eak/db';
import { Worker, type Job } from 'bullmq';
import { z } from 'zod';

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
 * Link detector. Scans recent messages from the configured source with the
 * owning userbot and persists normalized links into `discovered_links`.
 * The actual userbot read loop is deferred — this scaffold normalizes
 * strings fed via the job payload so unit tests can cover the critical
 * normalization and dedup logic.
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

      // Full implementation would call userbot.getMessages(source.telegramChatId, {limit: N}).
      const sampleMessages: string[] = [];

      const found = sampleMessages.flatMap((m) => extractLinks(m, source.mentionEnabled));
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
      log.info({ sourceId: source.id, found: found.length }, 'discovery scan complete');
      return { found: found.length };
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
