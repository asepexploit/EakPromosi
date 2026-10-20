import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

export async function registerHealthModule(app: FastifyInstance): Promise<void> {
  app.get(
    '/health',
    { schema: { response: { 200: z.object({ status: z.literal('ok'), uptimeSec: z.number() }) } } },
    async () => ({ status: 'ok' as const, uptimeSec: Math.floor(process.uptime()) }),
  );

  app.get('/ready', async (_req, reply) => {
    const checks = await Promise.allSettled([
      app.prisma.$queryRaw`SELECT 1`,
      app.redis.ping(),
    ]);
    const dbOk = checks[0].status === 'fulfilled';
    const redisOk = checks[1].status === 'fulfilled';
    const body = { db: dbOk, redis: redisOk };
    void reply.status(dbOk && redisOk ? 200 : 503).send(body);
  });
}
