import { loadEnv, createLogger, AppError } from '@eak/config';

import { buildApp } from './app.js';

async function main(): Promise<void> {
  const env = loadEnv();
  const logger = createLogger(env, { service: 'api' });
  const app = await buildApp({ env, logger });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutting down');
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'failed to close gracefully');
      process.exit(1);
    }
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  try {
    await app.listen({ port: env.API_PORT, host: env.API_HOST });
    logger.info({ port: env.API_PORT, host: env.API_HOST }, 'api listening');
  } catch (err) {
    if (err instanceof AppError) logger.fatal({ err: err.toJSON() }, 'startup failed');
    else logger.fatal({ err }, 'startup failed');
    process.exit(1);
  }
}

void main();
