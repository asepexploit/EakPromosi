import { AppError, QUEUE_NAMES } from '@eak/config';
import { WebhookStatus, Prisma } from '@eak/db';
import { z } from 'zod';

import type { ApiPlugin } from '../../plugin-types.js';
import { PakasirAdapter } from '../billing/pakasir.adapter.js';


/**
 * Pakasir webhook endpoint. The handler is intentionally thin:
 *  1. verify signature + replay window,
 *  2. persist raw payload (webhook_events, dedup on event_id),
 *  3. enqueue `billing:webhook` for the worker to process,
 *  4. 200 fast so Pakasir doesn't retry.
 *
 * See `.claude/rules/payment.md` + skill `pakasir-webhook`.
 *
 * The raw request body is captured by a scoped content-type parser that
 * stashes the bytes on `req.rawBody` BEFORE JSON parsing — Fastify's default
 * JSON parser would otherwise drain `req.raw` and signature verification
 * (which is byte-sensitive) would see an empty string.
 */
export const registerWebhooksModule: ApiPlugin = async (app) => {
  const adapter = new PakasirAdapter(app.env);

  // Scope: addContentTypeParser only affects this plugin's encapsulation.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer', bodyLimit: 256 * 1024 },
    (req, body: Buffer, done) => {
      (req as unknown as { rawBody: string }).rawBody = body.toString('utf8');
      try {
        const parsed = body.length ? JSON.parse(body.toString('utf8')) : {};
        done(null, parsed);
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  app.post(
    '/pakasir',
    {
      config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
      bodyLimit: 256 * 1024,
    },
    async (req, reply) => {
      const rawBody = (req as unknown as { rawBody?: string }).rawBody ?? '';
      const signature = headerOne(req.headers, 'x-pakasir-signature');
      const timestamp = headerOne(req.headers, 'x-pakasir-timestamp');
      const eventId = headerOne(req.headers, 'x-pakasir-event-id');
      if (!signature || !timestamp || !eventId) {
        throw new AppError('WEBHOOK_SIGNATURE_INVALID', 'Missing signature headers');
      }
      adapter.verifyWebhook({ rawBody, signature, timestamp });

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        throw new AppError('WEBHOOK_UNKNOWN_EVENT', 'Payload bukan JSON valid');
      }
      const schema = z.object({
        type: z.string(),
        data: z.object({
          invoice_id: z.string(),
          reference: z.string().optional(),
          paid_at: z.string().datetime({ offset: true }).optional(),
          status: z.string(),
        }),
      });
      const body = schema.parse(parsed);

      // Persist raw payload keyed by (provider, event_id). Unique constraint
      // guarantees idempotency — second delivery becomes a replay no-op. Any
      // other DB error must NOT be swallowed as a replay (we'd silently drop
      // the event instead of letting Pakasir retry).
      let dedup: { replay: boolean };
      try {
        await app.prisma.webhookEvent.create({
          data: {
            provider: 'pakasir',
            eventId,
            eventType: body.type,
            rawPayload: parsed as never,
            signature,
            status: WebhookStatus.received,
          },
        });
        dedup = { replay: false };
      } catch (err) {
        // P2002: unique constraint — expected replay. Anything else bubbles up
        // so Pakasir sees a 5xx and retries instead of us pretending success.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          dedup = { replay: true };
        } else {
          throw err;
        }
      }

      if (!dedup.replay) {
        await app.queues.queue(QUEUE_NAMES.billingWebhook).add(
          'pakasir.event',
          { eventId, type: body.type, invoiceId: body.data.invoice_id, paidAt: body.data.paid_at ?? null, status: body.data.status },
          { jobId: `pakasir:${eventId}`, removeOnComplete: true },
        );
      }

      void reply.status(200).send({ ok: true, replay: dedup.replay });
    },
  );
}

function headerOne(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
  const v = headers[name];
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
};
