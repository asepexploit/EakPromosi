import { AppError, QUEUE_NAMES } from '@eak/config';
import { InvoiceStatus, SubscriptionStatus, WebhookStatus, BillingPeriod } from '@eak/db';
import type { Worker} from 'bullmq';
import { type Job } from 'bullmq';
import { z } from 'zod';

import type { WorkerDeps } from '../../types.js';

const Payload = z.object({
  eventId: z.string(),
  type: z.string(),
  invoiceId: z.string(),
  status: z.string(),
  paidAt: z.string().nullable(),
});

/**
 * Processes Pakasir webhook events. The API endpoint has already verified
 * HMAC + replay + deduped on `event_id`; this worker only owns the state
 * transition. Idempotent — the event row's `processed_at` is the lock.
 *
 * Spec: `.claude/skills/pakasir-webhook/SKILL.md` + `.claude/rules/payment.md`.
 */
export function registerBillingWebhookWorker(deps: WorkerDeps): Worker {
  const log = deps.logger.child({ worker: 'billing:webhook' });

  return deps.queues.worker(
    QUEUE_NAMES.billingWebhook,
    async (job: Job) => {
      const payload = Payload.parse(job.data);
      const event = await deps.prisma.webhookEvent.findUnique({
        where: { provider_eventId: { provider: 'pakasir', eventId: payload.eventId } },
      });
      if (!event) throw new AppError('NOT_FOUND', 'webhook event missing');
      if (event.processedAt) {
        log.info({ eventId: payload.eventId }, 'already processed, skipping');
        return { skipped: 'already_processed' };
      }

      const invoice = await deps.prisma.invoice.findUnique({
        where: { pakasirInvoiceId: payload.invoiceId },
        include: { plan: true },
      });
      if (!invoice) {
        await deps.prisma.webhookEvent.update({
          where: { id: event.id },
          data: { status: WebhookStatus.failed, errorMessage: 'invoice_not_found' },
        });
        return { skipped: 'invoice_not_found' };
      }

      switch (payload.type) {
        case 'invoice.paid': {
          if (invoice.status !== InvoiceStatus.pending) break; // no-op per spec
          const paidAt = payload.paidAt ? new Date(payload.paidAt) : new Date();
          const days = invoice.period === BillingPeriod.monthly ? 30 : 365;

          await deps.prisma.$transaction(async (tx) => {
            await tx.invoice.update({ where: { id: invoice.id }, data: { status: InvoiceStatus.paid, paidAt } });
            const activeSub = await tx.subscription.findFirst({
              where: { tenantId: invoice.tenantId, status: SubscriptionStatus.active },
              orderBy: { endsAt: 'desc' },
            });
            if (activeSub && activeSub.planId === invoice.planId) {
              const base = activeSub.endsAt > paidAt ? activeSub.endsAt : paidAt;
              await tx.subscription.update({
                where: { id: activeSub.id },
                data: { endsAt: new Date(base.getTime() + days * 86_400_000) },
              });
            } else {
              if (activeSub) {
                await tx.subscription.update({
                  where: { id: activeSub.id },
                  data: { status: SubscriptionStatus.canceled, canceledAt: paidAt },
                });
              }
              await tx.subscription.create({
                data: {
                  tenantId: invoice.tenantId,
                  planId: invoice.planId,
                  status: SubscriptionStatus.active,
                  startsAt: paidAt,
                  endsAt: new Date(paidAt.getTime() + days * 86_400_000),
                },
              });
              await tx.tenant.update({ where: { id: invoice.tenantId }, data: { planId: invoice.planId } });
            }
            await tx.auditLog.create({
              data: {
                tenantId: invoice.tenantId,
                action: 'billing.subscription.activated',
                resource: 'subscription',
                resourceId: invoice.id,
                after: { planCode: invoice.plan.code, period: invoice.period } as never,
                severity: 'info',
              },
            });
          });
          break;
        }
        case 'invoice.failed':
          await deps.prisma.invoice.update({ where: { id: invoice.id }, data: { status: InvoiceStatus.failed } });
          break;
        case 'invoice.expired':
          await deps.prisma.invoice.update({ where: { id: invoice.id }, data: { status: InvoiceStatus.expired } });
          break;
        default:
          log.warn({ type: payload.type }, 'unknown webhook event type');
      }

      await deps.prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: WebhookStatus.processed, processedAt: new Date() },
      });
      return { ok: true };
    },
    { concurrency: 10 },
  );
}
