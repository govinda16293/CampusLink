import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsOrigins, isTest } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.route.js';
import { healthRouter } from './modules/health/health.route.js';

/**
 * Builds the Express application.
 *
 * Kept separate from `index.ts` (which owns the HTTP listener) so integration tests can drive
 * the app with supertest without binding a port.
 */
export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (!isTest) {
    app.use(morgan('dev'));
  }

  // Feature routers are mounted under /api as they are built.
  app.use('/api', healthRouter);
  app.use('/api', authRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
