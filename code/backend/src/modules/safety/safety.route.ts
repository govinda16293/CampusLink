import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import * as safetyController from './safety.controller.js';

/**
 * Trust and safety.
 *
 * The student-facing half is deliberately small: report somebody, block somebody, see who you
 * have blocked. There is no endpoint that tells a student what happened to a report, who else
 * reported the same person, or whether somebody has blocked them — each of those would turn a
 * safety feature into a way to find things out about other people.
 *
 * The admin half sits behind `requireAdmin`, which reads the role from the database rather than
 * the token, so a demotion takes effect immediately rather than whenever a session expires.
 */
export const safetyRouter = Router();

safetyRouter.post('/reports', requireAuth, safetyController.report);
safetyRouter.get('/blocks', requireAuth, safetyController.myBlocks);
safetyRouter.post('/blocks/:id', requireAuth, safetyController.block);
safetyRouter.delete('/blocks/:id', requireAuth, safetyController.unblock);

safetyRouter.get('/admin/reports', requireAuth, requireAdmin, safetyController.adminReports);
safetyRouter.post(
  '/admin/reports/:id/unmask',
  requireAuth,
  requireAdmin,
  safetyController.adminUnmask,
);
safetyRouter.post(
  '/admin/reports/:id/review',
  requireAuth,
  requireAdmin,
  safetyController.adminReview,
);
safetyRouter.get('/admin/audit', requireAuth, requireAdmin, safetyController.adminAudit);
