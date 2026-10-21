import { type Env, type Logger, corsOrigins, QueueFactory, keyFromBase64, createRedis } from '@eak/config';
import { prisma } from '@eak/db';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import websocket from '@fastify/websocket';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';

import { registerAccountsModule } from './modules/accounts/accounts.routes.js';
import { registerAdminModule } from './modules/admin/admin.routes.js';
import { registerAuditModule } from './modules/audit/audit.routes.js';
import { registerAuthModule } from './modules/auth/auth.routes.js';
import { registerBillingModule } from './modules/billing/billing.routes.js';
import { registerBroadcastsModule } from './modules/broadcasts/broadcasts.routes.js';
import { registerCampaignsModule } from './modules/campaigns/campaigns.routes.js';
import { registerDashboardModule } from './modules/dashboard/dashboard.routes.js';
import { registerDiscoveryModule } from './modules/discovery/discovery.routes.js';
import { registerDmModule } from './modules/dm/dm.routes.js';
import { registerGroupsModule } from './modules/groups/groups.routes.js';
import { registerHealthModule } from './modules/health/health.routes.js';
import { registerMonitoringModule } from './modules/monitoring/monitoring.routes.js';
import { registerPlansModule } from './modules/plans/plans.routes.js';
import { registerSubscriptionsModule } from './modules/subscriptions/subscriptions.routes.js';
import { registerTenantsModule } from './modules/tenants/tenants.routes.js';
import { registerWebhooksModule } from './modules/webhooks/webhooks.routes.js';
import type { FastifyTypedInstance } from './plugin-types.js';
import { registerAuthContext } from './plugins/auth-context.js';
import { registerCsrf } from './plugins/csrf.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerRequestId } from './plugins/request-id.js';

export interface BuildAppDeps {
  env: Env;
  logger: Logger;
}

export async function buildApp({ env, logger }: BuildAppDeps): Promise<FastifyTypedInstance> {
  const app = Fastify({
    loggerInstance: logger,
    trustProxy: env.TRUST_PROXY,
    disableRequestLogging: true, // we add our own access log via request-id plugin
    bodyLimit: 1_048_576, // 1MB default; webhook & upload routes override
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // ---- security ----------------------------------------------------------
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: corsOrigins(env),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });
  await app.register(cookie, { secret: env.SESSION_SECRET, hook: 'onRequest' });
  await app.register(rateLimit, {
    global: false, // per-route rate limits via config block
    max: 300,
    timeWindow: '1 minute',
  });
  await app.register(sensible);
  await app.register(websocket);

  // ---- shared singletons -------------------------------------------------
  const encryptionKey = keyFromBase64(env.SESSION_ENCRYPTION_KEY_VERSION, env.SESSION_ENCRYPTION_KEY);
  const redis = createRedis(env);
  const queueFactory = new QueueFactory({ env });

  app.decorate('env', env);
  app.decorate('prisma', prisma);
  app.decorate('redis', redis);
  app.decorate('queues', queueFactory);
  app.decorate('encryptionKeys', [encryptionKey]);

  app.addHook('onClose', async () => {
    await queueFactory.close();
    await redis.quit().catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
  });

  // ---- framework plugins -------------------------------------------------
  await registerRequestId(app);
  await registerErrorHandler(app);
  await registerAuthContext(app);
  await registerCsrf(app);

  // ---- modules -----------------------------------------------------------
  await app.register(registerHealthModule);
  await app.register(registerAuthModule, { prefix: '/auth' });
  await app.register(registerTenantsModule, { prefix: '/tenants' });
  await app.register(registerAccountsModule, { prefix: '/accounts' });
  await app.register(registerGroupsModule, { prefix: '/groups' });
  await app.register(registerDiscoveryModule, { prefix: '/discovery' });
  await app.register(registerBroadcastsModule, { prefix: '/broadcasts' });
  await app.register(registerCampaignsModule, { prefix: '/campaigns' });
  await app.register(registerDmModule, { prefix: '/dm' });
  await app.register(registerPlansModule, { prefix: '/plans' });
  await app.register(registerSubscriptionsModule, { prefix: '/subscriptions' });
  await app.register(registerBillingModule, { prefix: '/billing' });
  await app.register(registerDashboardModule, { prefix: '/dashboard' });
  await app.register(registerMonitoringModule, { prefix: '/monitoring' });
  await app.register(registerAuditModule, { prefix: '/audit' });
  await app.register(registerWebhooksModule, { prefix: '/webhooks' });
  await app.register(registerAdminModule, { prefix: '/admin' });

  return app;
}
