import type { z } from 'zod';
import type { updateProfileSchema } from '@campuslink/shared';
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
