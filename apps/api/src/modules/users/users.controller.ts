import type { Request, Response } from 'express';
import { updateProfileSchema } from '@campuslink/shared';
import { AppError } from '../../lib/AppError.js';
import * as usersService from './users.service.js';

/**
 * Controllers validate, delegate, and shape the response — nothing else. The rules about what a
 * student may change live in users.service.ts, where they can be tested without HTTP.
 */

export async function getMe(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  res.json({ user: await usersService.getOwnProfile(req.auth.userId) });
}

export async function updateMe(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  const input = updateProfileSchema.parse(req.body);
  res.json({ user: await usersService.updateOwnProfile(req.auth.userId, input) });
}

export async function getById(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();

  // Asking for your own id by hand should still give you your own full profile.
  if (req.params.id === req.auth.userId) {
    res.json({ user: await usersService.getOwnProfile(req.auth.userId) });
    return;
  }

  res.json({ user: await usersService.getPublicProfile(String(req.params.id)) });
}
