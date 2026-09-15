import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import * as requestsController from './requests.controller.js';

/**
 * Join requests.
 *
 * Each state change is its own verb rather than a PATCH carrying a new status. The endpoints map
 * one-to-one onto the transitions in domain/joinRequest.ts, and there is no request body through
 * which a student could try to set their own request to ACCEPTED.
 */
export const requestsRouter = Router();

requestsRouter.post('/goals/:id/requests', requireAuth, requestsController.create);
requestsRouter.get('/goals/:id/requests', requireAuth, requestsController.listForGoal);
requestsRouter.post('/requests/:id/accept', requireAuth, requestsController.accept);
requestsRouter.post('/requests/:id/reject', requireAuth, requestsController.reject);
requestsRouter.post('/requests/:id/withdraw', requireAuth, requestsController.withdraw);
