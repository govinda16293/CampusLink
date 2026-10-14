import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import * as messagesController from './messages.controller.js';

/**
 * Lobby chat.
 *
 * Sending is an ordinary HTTP POST, not a socket event, and that is deliberate. One write path
 * means one place where authorization happens — the same service the reads go through, covered by
 * the same tests. A socket that could also write would be a second door into a room full of real
 * names, and the weaker of the two is the one that gets forgotten. The socket only delivers what
 * this endpoint has already accepted.
 */
export const messagesRouter = Router();

messagesRouter.get('/goals/:id/messages', requireAuth, messagesController.list);
messagesRouter.post('/goals/:id/messages', requireAuth, messagesController.send);
