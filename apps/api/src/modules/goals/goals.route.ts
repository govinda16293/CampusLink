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
goalsRouter.delete('/goals/:id', requireAuth, goalsController.cancel);
