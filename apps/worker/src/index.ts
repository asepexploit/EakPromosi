import { createLogger, loadEnv, QueueFactory, keyFromBase64 } from '@eak/config';
import { prisma } from '@eak/db';

import { registerBillingWebhookWorker } from './queues/billing/webhook.worker.js';
import { registerCampaignsSchedulerWorker } from './queues/campaigns/scheduler.worker.js';
import { registerReportsAggregateWorker } from './queues/reports/aggregate.worker.js';
import { registerTelegramAuthWorker } from './queues/telegram/auth.worker.js';
import { registerTelegramBroadcastWorker } from './queues/telegram/broadcast.worker.js';
import { registerTelegramDmReplyWorker } from './queues/telegram/dm-reply.worker.js';
import { registerTelegramJoinWorker } from './queues/telegram/join.worker.js';
import { registerTelegramLinkDetectWorker } from './queues/telegram/link-detect.worker.js';
import { registerTelegramMembershipSyncWorker } from './queues/telegram/membership-sync.worker.js';

async function main(): Promise<void> {
  const env = loadEnv();
  const logger = createLogger(env, { service: 'worker' });
  const encryptionKeys = [keyFromBase64(env.SESSION_ENCRYPTION_KEY_VERSION, env.SESSION_ENCRYPTION_KEY)];
  const queues = new QueueFactory({ env });
  const redis = queues.connection;
  const tgDeps = { env, logger, prisma, queues, encryptionKeys, redis } as const;

  const workers = [
    registerTelegramAuthWorker(tgDeps),
    registerTelegramJoinWorker(tgDeps),
    registerTelegramBroadcastWorker(tgDeps),
    registerTelegramDmReplyWorker(tgDeps),
    registerTelegramLinkDetectWorker(tgDeps),
    registerTelegramMembershipSyncWorker(tgDeps),
    registerBillingWebhookWorker({ env, logger, prisma, queues }),
    registerCampaignsSchedulerWorker({ env, logger, prisma, queues }),
    registerReportsAggregateWorker({ env, logger, prisma, queues }),
  ];

  logger.info({ queues: workers.length }, 'worker started');

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutting down worker');
    await Promise.all(workers.map((w) => w.close()));
    await queues.close();
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void main();
