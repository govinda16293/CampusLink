import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import * as goalsController from './goals.controller.js';

/**
 * The feed is for signed-in students only. A public campus feed listing who is going where and
 * when is exactly the kind of thing the trust layer exists to prevent.
 */
export const goalsRouter = Router();

goalsRouter.post('/goals', requireAuth, goalsController.create);
goalsRouter.get('/goals', requireAuth, goalsController.list);
goalsRouter.get('/goals/:id', requireAuth, goalsController.getById);
goalsRouter.patch('/goals/:id', requireAuth, goalsController.update);
goalsRouter.delete('/goals/:id', requireAuth, goalsController.cancel);

// The lobby. Each lifecycle change is its own verb rather than a PATCH carrying a new status, as
// with join requests: the endpoints map one-to-one onto the transitions in domain/goal.ts, and
// there is no request body through which a poster could set a status the machine forbids.
goalsRouter.get('/goals/:id/lobby', requireAuth, goalsController.lobby);
goalsRouter.post('/goals/:id/close', requireAuth, goalsController.close);
goalsRouter.post('/goals/:id/complete', requireAuth, goalsController.complete);
goalsRouter.post('/goals/:id/reopen', requireAuth, goalsController.reopen);
