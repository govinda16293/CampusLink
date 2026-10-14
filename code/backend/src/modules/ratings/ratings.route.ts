import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import * as ratingsController from './ratings.controller.js';

/**
 * Ratings: who turned up.
 *
 * Scoped under the goal, because an answer is always about one person at one goal — there is no
 * such thing as rating somebody in general, which is exactly what stops this becoming a way to
 * follow a student around the platform marking them down.
 */
export const ratingsRouter = Router();

ratingsRouter.get('/goals/:id/ratings', requireAuth, ratingsController.summary);
ratingsRouter.post('/goals/:id/ratings', requireAuth, ratingsController.submit);
