import type { PrismaClient } from '@eak/db';

/**
 * Append-only audit trail. Every sensitive mutation calls `log(...)` so
 * the admin panel and compliance can trace who did what.
 * See .claude/rules/product.md checklist + product-spec §16.
 */
export class AuditService {
  constructor(private readonly prisma: PrismaClient) {}

  async log(input: {
    tenantId?: string | null;
    actorUserId?: string | null;
    action: string;
    resource: string;
    resourceId?: string | null;
    before?: unknown;
    after?: unknown;
    severity?: 'info' | 'warn' | 'critical';
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: input.tenantId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId ?? null,
        before: (input.before as never) ?? null,
        after: (input.after as never) ?? null,
        severity: input.severity ?? 'info',
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }
}
