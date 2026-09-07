import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './db/prisma.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`CampusLink API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  console.log(`Health check: http://localhost:${env.PORT}/api/health`);
});

/**
 * Close the HTTP listener and the database pool before exiting, so in-flight requests finish
 * and the deployment platform does not report a hard crash on every redeploy.
 */
async function shutdown(signal: string) {
  console.log(`\n${signal} received, shutting down.`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  // Don't hang forever if a connection refuses to drain.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
