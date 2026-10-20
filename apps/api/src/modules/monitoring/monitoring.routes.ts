import { QUEUE_NAMES } from '@eak/config';
import { MonitoringSnapshotSchema, envelope, type QueueName } from '@eak/shared';
import type { FastifyInstance } from 'fastify';

import { ok } from '../../lib/response.js';

export async function registerMonitoringModule(app: FastifyInstance): Promise<void> {
  app.get(
    '/snapshot',
    { preHandler: app.requireTenant, schema: { response: { 200: envelope(MonitoringSnapshotSchema) } } },
    async () => {
      const queues = Object.values(QUEUE_NAMES);
      const stats = await Promise.all(
        queues.map(async (name) => {
          const q = app.queues.queue(name);
          const [waiting, active, delayed, failed] = await Promise.all([
            q.getWaitingCount(),
            q.getActiveCount(),
            q.getDelayedCount(),
            q.getFailedCount(),
          ]);
          return {
            name: name as QueueName,
            waiting,
            active,
            completed24h: 0, // computed by worker reports:aggregate
            failed,
            delayed,
          };
        }),
      );
      return ok({
        services: { api: 'ok' as const, worker: 'ok' as const, postgres: 'ok' as const, redis: 'ok' as const, telegram: 'ok' as const },
        queues: stats,
        recentErrors: [],
      });
    },
  );

  // WebSocket for live updates — subscribes to Redis pubsub channel the worker
  // publishes to. For now we just keep the socket open and the worker will
  // push `LiveEvent` payloads.
  app.get('/live', { websocket: true, preHandler: app.requireTenant }, (socket, req) => {
    const sub = app.redis.duplicate();
    const channel = `eak:live:${req.tenant!.id}`;
    void sub.subscribe(channel);
    sub.on('message', (_ch, msg) => socket.send(msg));
    socket.on('close', () => {
      void sub.unsubscribe(channel);
      void sub.quit();
    });
  });
}
