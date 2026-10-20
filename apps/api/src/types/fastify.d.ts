import 'fastify';
import type { PrismaClient } from '@eak/db';
import type { Env, QueueFactory, EncryptionKey } from '@eak/config';
import type { Redis } from 'ioredis';
import type { TenantRole } from '@eak/shared';

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
