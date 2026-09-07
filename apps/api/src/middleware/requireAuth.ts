import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import { verifyAccessToken } from '../lib/jwt.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by requireAuth. Absent on public routes. */
      auth?: { userId: string; role: string };
    }
  }
}

/**
 * Rejects anything without a valid `Authorization: Bearer <token>` header.
 *
 * This only proves who the caller is. Whether they may act on a particular goal or lobby is a
 * separate question answered in the service layer, where the ownership rules live.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Sign in to continue'));
  }

  const payload = verifyAccessToken(header.slice('Bearer '.length).trim());
  req.auth = { userId: payload.sub, role: payload.role };
  next();
}
