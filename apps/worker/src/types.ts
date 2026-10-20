import type { Env, EncryptionKey, Logger, QueueFactory } from '@eak/config';
import type { PrismaClient } from '@eak/db';
import type { Redis } from 'ioredis';

export interface WorkerDeps {
  env: Env;
  logger: Logger;
  prisma: PrismaClient;
  queues: QueueFactory;
}

export interface TelegramWorkerDeps extends WorkerDeps {
  encryptionKeys: EncryptionKey[];
  redis: Redis;
}
