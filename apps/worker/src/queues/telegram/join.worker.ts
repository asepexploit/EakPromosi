import { QUEUE_NAMES } from '@eak/config';
import { JoinJobStatus, GroupKind, MembershipStatus } from '@eak/db';
import type { Worker} from 'bullmq';
import { type Job } from 'bullmq';
import { Api } from 'telegram';
import { z } from 'zod';

import { RetryableJobError, runTelegramCall } from '../../telegram/safety.js';
import { UserbotAdapter } from '../../telegram/userbot.adapter.js';
import type { TelegramWorkerDeps } from '../../types.js';

const Payload = z.object({
  tenantId: z.string(),
  joinJobId: z.string(),
});

/**
 * Processes `join_jobs`:
 *   1. resolve `rawTarget` (username / `+invite` / full URL),
 *   2. open the owning account's userbot,
 *   3. channels.JoinChannel for public or messages.ImportChatInvite for private,
 *   4. upsert `groups` (unique by telegram_chat_id) + `group_memberships`.
 *
 * Flood-wait reschedules the BullMQ job via `moveToDelayed`; permanent errors
 * mark the job failed. See .claude/rules/telegram.md.
 */
export function registerTelegramJoinWorker(deps: TelegramWorkerDeps): Worker {
  const log = deps.logger.child({ worker: 'telegram:join' });

  return deps.queues.worker(
    QUEUE_NAMES.telegramJoin,
    async (job: Job) => {
      const payload = Payload.parse(job.data);

      const row = await deps.prisma.joinJob.findFirst({
        where: { id: payload.joinJobId, tenantId: payload.tenantId },
        include: { account: true },
      });
      if (!row || !row.account.sessionCipher) return { skipped: 'not_found_or_no_session' };
      // Terminal states — a BullMQ retry landing here must not re-run the join.
      // `joining` is reachable on a crash recovery and should be re-tried.
      if (row.status === JoinJobStatus.joined || row.status === JoinJobStatus.skipped) {
        return { skipped: `terminal:${row.status}` };
      }

      await deps.prisma.joinJob.update({
        where: { id: row.id },
        data: { status: JoinJobStatus.joining, startedAt: new Date(), attempts: { increment: 1 } },
      });

      const target = parseTarget(row.rawTarget);
      const userbot = new UserbotAdapter({
        env: deps.env,
        encryptionKeys: deps.encryptionKeys,
        deviceModel: row.account.deviceModel,
        systemVersion: row.account.systemVersion,
        appVersion: row.account.appVersion,
      });

      try {
        const client = await userbot.connectWithCipher(row.account.sessionCipher);

        if (target.kind === 'invite') {
          await runTelegramCall(() => userbot.joinInvite(target.hash));
        } else {
          await runTelegramCall(() => userbot.joinPublic(target.username));
        }

        // Resolve chat metadata so we can upsert the groups row
        const peer = target.kind === 'invite' ? target.hash : target.username;
        const entity = await runTelegramCall(() => client.getEntity(peer));
        const chatId = String((entity as { id: unknown }).id);
        const title = (entity as { title?: string; username?: string }).title ?? (entity as { username?: string }).username ?? 'Unknown';
        const username = (entity as { username?: string }).username ?? null;
        const kind = resolveKind(entity);

        const group = await deps.prisma.group.upsert({
          where: { tenantId_telegramChatId: { tenantId: payload.tenantId, telegramChatId: chatId } },
          update: { title, username, kind, lastSyncedAt: new Date() },
          create: {
            tenantId: payload.tenantId,
            telegramChatId: chatId,
            title,
            username,
            kind,
            lastSyncedAt: new Date(),
          },
        });
        await deps.prisma.groupMembership.upsert({
          where: { groupId_accountId: { groupId: group.id, accountId: row.accountId } },
          update: { status: MembershipStatus.member, joinedAt: new Date(), lastCheckedAt: new Date() },
          create: {
            tenantId: payload.tenantId,
            groupId: group.id,
            accountId: row.accountId,
            status: MembershipStatus.member,
            joinedAt: new Date(),
            lastCheckedAt: new Date(),
          },
        });

        await deps.prisma.joinJob.update({
          where: { id: row.id },
          data: { status: JoinJobStatus.joined, finishedAt: new Date(), groupId: group.id },
        });
        return { ok: true, groupId: group.id };
      } catch (err) {
        if (err instanceof RetryableJobError) {
          log.warn({ joinJobId: row.id, delayMs: err.delayMs }, 'flood_wait, rescheduling');
          await deps.prisma.joinJob.update({
            where: { id: row.id },
            data: {
              status: JoinJobStatus.queued,
              retryAfter: new Date(Date.now() + err.delayMs),
              lastError: 'flood_wait',
            },
          });
          await job.moveToDelayed(Date.now() + err.delayMs);
          return { requeued: true };
        }
        await deps.prisma.joinJob.update({
          where: { id: row.id },
          data: {
            status: JoinJobStatus.failed,
            finishedAt: new Date(),
            lastError: err instanceof Error ? err.message : String(err),
          },
        });
        throw err;
      } finally {
        await userbot.disconnect().catch(() => undefined);
      }
    },
    { concurrency: 4 },
  );
}

function parseTarget(raw: string): { kind: 'public'; username: string } | { kind: 'invite'; hash: string } {
  // Normalize full URLs down to the username / invite hash.
  const trimmed = raw.replace(/^https?:\/\/(t\.me|telegram\.me)\//, '').replace(/^@/, '');
  if (trimmed.startsWith('+')) return { kind: 'invite', hash: trimmed.slice(1) };
  if (trimmed.startsWith('joinchat/')) return { kind: 'invite', hash: trimmed.slice('joinchat/'.length) };
  return { kind: 'public', username: trimmed };
}

function resolveKind(entity: unknown): GroupKind {
  // GramJS entities are instances of Api.Chat / Api.Channel / Api.User.
  if (entity instanceof Api.Channel) {
    return entity.megagroup ? GroupKind.supergroup : GroupKind.channel;
  }
  if (entity instanceof Api.Chat) return GroupKind.group;
  return GroupKind.group;
}
