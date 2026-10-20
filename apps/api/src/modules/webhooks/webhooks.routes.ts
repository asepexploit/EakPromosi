import { AppError, QUEUE_NAMES } from '@eak/config';
import { WebhookStatus } from '@eak/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { PakasirAdapter } from '../billing/pakasir.adapter.js';

/**
 * Pakasir webhook endpoint. The handler is intentionally thin:
 *  1. verify signature + replay window,
 *  2. persist raw payload (webhook_events, dedup on event_id),
 *  3. enqueue `billing:webhook` for the worker to process,
 *  4. 200 fast so Pakasir doesn't retry.
 *
 * See `.claude/rules/payment.md` + skill `pakasir-webhook`.
 */
export async function registerWebhooksModule(app: FastifyInstance): Promise<void> {
  const adapter = new PakasirAdapter(app.env);

  app.post<{ Body: string }>(
    '/pakasir',
    {
      config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
      bodyLimit: 256 * 1024,
      // We need the raw body for signature verification — register a custom parser
      preParsing: async (req, _reply, payload) => payload,
    },
    async (req, reply) => {
      const rawBody = await readRawBody(req.raw);
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
      // guarantees idempotency — second delivery becomes a replay no-op.
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
      } catch {
        dedup = { replay: true };
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

async function readRawBody(raw: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of raw) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function headerOne(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
  const v = headers[name];
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}
