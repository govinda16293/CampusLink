import { Router } from 'express';
import { prisma } from '../../db/prisma.js';

/**
 * Liveness + readiness endpoint.
 *
 * The frontend calls this on load to show its "API connected" banner, and the hosting provider
 * uses it as a health check. It touches the database on purpose: an API process that is up but
 * cannot reach the database is not actually serving, and should report as degraded.
 *
 * Note that async handlers need no wrapper here — Express 5 forwards a rejected promise to the
 * error middleware on its own, which Express 4 did not.
 */
export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  let database: 'up' | 'down' = 'up';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error('[health] database check failed', error);
    database = 'down';
  }

  res.status(database === 'up' ? 200 : 503).json({
    status: database === 'up' ? 'ok' : 'degraded',
    service: 'campuslink-api',
    database,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
