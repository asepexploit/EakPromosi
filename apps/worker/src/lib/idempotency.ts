import type { PrismaClient } from '@eak/db';

/**
 * Idempotency guard. Workers call `ensureOnce` with a stable key per
 * logical job (e.g. `broadcast-target:<id>`); the first call records the
 * row, subsequent calls return `{ alreadyProcessed: true }` and the
 * caller skips side effects.
 */
export async function ensureOnce(
  prisma: PrismaClient,
  input: { queueName: string; idempotencyKey: string; tenantId: string | null; jobId: string | null },
): Promise<{ alreadyProcessed: boolean }> {
  try {
    await prisma.processedJob.create({
      data: {
        queueName: input.queueName,
        idempotencyKey: input.idempotencyKey,
        tenantId: input.tenantId,
        jobId: input.jobId,
      },
    });
    return { alreadyProcessed: false };
  } catch {
    return { alreadyProcessed: true };
  }
}

export async function recordResult(
  prisma: PrismaClient,
  input: { queueName: string; idempotencyKey: string; result: unknown },
): Promise<void> {
  await prisma.processedJob.updateMany({
    where: { queueName: input.queueName, idempotencyKey: input.idempotencyKey },
    data: { result: input.result as never },
  });
}
