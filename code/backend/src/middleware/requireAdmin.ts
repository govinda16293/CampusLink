import type { NextFunction, Request, Response } from 'express';
import { USER_ROLE } from '@campuslink/shared';
import { prisma } from '../db/prisma.js';
import { AppError } from '../lib/AppError.js';

/**
 * Rejects anything that is not an admin, reading the role from the **database** rather than the
 * token.
 *
 * The JWT carries a role, and trusting it here would be a mistake: a token is issued at login and
 * lives for its whole lifetime, so somebody demoted this morning would keep administrative access
 * until theirs expired. For an ordinary request that staleness is harmless; for unmasking an
 * anonymous student it is not. One extra query is a small price for the role being current.
 *
 * Runs after `requireAuth`, never instead of it.
 */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) return next(AppError.unauthorized());

  const user = await prisma.user.findUnique({
    where: { id: req.auth.userId },
    select: { role: true },
  });

  if (user?.role !== USER_ROLE.ADMIN) {
    // A plain 404 would be kinder to the existence of the admin area, but these routes are not a
    // secret — they are linked from an admin's own navigation — and a clear refusal is more
    // useful than a confusing one.
    return next(AppError.forbidden('That area is for moderators'));
  }

  req.auth.role = USER_ROLE.ADMIN;
  next();
}
