import 'fastify';
import type { Env, QueueFactory, EncryptionKey } from '@eak/config';
import type { PrismaClient } from '@eak/db';
import type { TenantRole } from '@eak/shared';
import type { Redis } from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    env: Env;
    prisma: PrismaClient;
    redis: Redis;
    queues: QueueFactory;
    encryptionKeys: EncryptionKey[];
  }
  interface FastifyRequest {
    requestId: string;
    user?: { id: string; email: string; isPlatformAdmin: boolean };
    tenant?: { id: string; role: TenantRole };
    csrfOk?: boolean;
  }
}
