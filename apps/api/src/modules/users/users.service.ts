import type { z } from 'zod';
import { AVATAR_MAX_BYTES, type updateProfileSchema } from '@campuslink/shared';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../lib/AppError.js';
import {
  joinInterests,
  toPrivateUserDTO,
  toPublicUserDTO,
} from '../../serializers/user.serializer.js';

type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export async function getOwnProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.unauthorized('Your account no longer exists');
  return toPrivateUserDTO(user);
}

export async function getPublicProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound('That student does not exist');
  return toPublicUserDTO(user);
}

/**
 * Updates the caller's own profile.
 *
 * The write is built field by field from an explicit allow-list rather than by spreading the
 * validated input into `data`. That is the second of two guards against mass assignment — the
 * Zod schema is `.strict()` and has no `role` or `reliabilityScore` key, and this function would
 * ignore them even if it did. The trust layer is only worth anything if a student cannot set
 * their own reliability score, so it is worth being defended twice.
 *
 * `undefined` means "not part of this PATCH" and is left alone; `null` means "clear this field"
 * and is written. Prisma treats them the same way, which is what makes a partial update work.
 */
export async function updateOwnProfile(userId: string, input: UpdateProfileInput) {
  const data: Record<string, unknown> = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.branch !== undefined) data.branch = input.branch;
  if (input.year !== undefined) data.year = input.year;
  if (input.gender !== undefined) data.gender = input.gender;
  if (input.interests !== undefined) data.interests = joinInterests(input.interests);

  if (Object.keys(data).length === 0) {
    throw AppError.badRequest('Nothing to update');
  }

  try {
    const user = await prisma.user.update({ where: { id: userId }, data });
    return toPrivateUserDTO(user);
  } catch {
    // The token verified but the row is gone — a deleted account holding a live JWT.
    throw AppError.unauthorized('Your account no longer exists');
  }
}

/**
 * Stores a student's avatar.
 *
 * The client resizes and crops before sending, so the payload arriving here is already small.
 * The size is re-checked anyway — a client-side cap is a convenience, never a limit — and the
 * media type is taken from the data URL prefix that the Zod schema has already constrained to
 * JPEG, PNG or WebP. SVG is deliberately not accepted: it can carry script, and it would be
 * served straight back to a browser.
 */
export async function setOwnAvatar(userId: string, dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) throw AppError.badRequest('Upload a JPEG, PNG or WebP image');

  const [, mimeType, base64] = match;
  const bytes = Buffer.from(base64!, 'base64');

  if (bytes.length === 0) throw AppError.badRequest('That image appears to be empty');
  if (bytes.length > AVATAR_MAX_BYTES) {
    throw AppError.badRequest('That image is too large — try a smaller one');
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      photoData: base64,
      photoMimeType: mimeType,
      photoUpdatedAt: new Date(),
    },
  });

  return toPrivateUserDTO(user);
}

export async function removeOwnAvatar(userId: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { photoData: null, photoMimeType: null, photoUpdatedAt: null },
  });
  return toPrivateUserDTO(user);
}

/** The raw avatar bytes, for the endpoint that serves them to an <img> tag. */
export async function getAvatar(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { photoData: true, photoMimeType: true, photoUpdatedAt: true },
  });

  if (!user?.photoData || !user.photoMimeType) throw AppError.notFound('No photo');

  return {
    buffer: Buffer.from(user.photoData, 'base64'),
    mimeType: user.photoMimeType,
    updatedAt: user.photoUpdatedAt ?? new Date(0),
  };
}
