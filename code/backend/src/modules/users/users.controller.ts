import type { Request, Response } from 'express';
import { avatarUploadSchema, updateProfileSchema } from '@campuslink/shared';
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

export async function uploadAvatar(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  const { dataUrl } = avatarUploadSchema.parse(req.body);
  res.json({ user: await usersService.setOwnAvatar(req.auth.userId, dataUrl) });
}

export async function deleteAvatar(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  res.json({ user: await usersService.removeOwnAvatar(req.auth.userId) });
}

/**
 * Serves the avatar bytes.
 *
 * Unauthenticated, because a browser cannot attach a bearer token to an `<img src>` and fetching
 * every avatar through JavaScript would defeat HTTP caching on a feed. The id is a cuid, so the
 * URL is unguessable, and an avatar is the least sensitive thing a profile holds. If this ever
 * needs tightening the answer is signed, expiring URLs rather than moving it behind requireAuth.
 */
export async function getAvatarBytes(req: Request, res: Response) {
  const { buffer, mimeType, updatedAt } = await usersService.getAvatar(String(req.params.id));

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Length', String(buffer.length));
  res.setHeader('Last-Modified', updatedAt.toUTCString());
  // Safe to cache hard: the URL carries an upload-timestamp parameter, so a new photo is a new
  // URL. `private` keeps it out of shared proxy caches.
  res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
  res.send(buffer);
}
