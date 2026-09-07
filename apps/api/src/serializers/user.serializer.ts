import type { User } from '@prisma/client';
import { profileCompleteness, missingProfileFields } from '../domain/profileCompleteness.js';

/**
 * Turns database rows into the shapes the API is allowed to return.
 *
 * Nothing else in the codebase may put a User on a response. Routing every user through here
 * means `passwordHash` cannot leak by someone forgetting to strip it, and it is the same choke
 * point that will enforce anonymous posting in Step 3 — one place to audit, not dozens.
 */

/** The full profile, returned only to the user themselves. */
export function toPrivateUserDTO(user: User) {
  const interests = splitInterests(user.interests);
  const profile = {
    branch: user.branch,
    year: user.year,
    gender: user.gender,
    interests,
  };

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isVerified: user.isVerified,
    branch: user.branch,
    year: user.year,
    gender: user.gender,
    photoUrl: user.photoUrl,
    interests,
    role: user.role,
    reliabilityScore: user.reliabilityScore,
    goalsCompleted: user.goalsCompleted,
    createdAt: user.createdAt.toISOString(),
    // Only on the private DTO: how finished someone's own profile is, is their business.
    profileCompleteness: profileCompleteness(profile),
    missingProfileFields: missingProfileFields(profile),
  };
}

/**
 * What any other student may see about a user.
 *
 * Email is deliberately absent: it is the one field that identifies a real person off-platform,
 * and nothing in the product needs another student to know it. `role` is absent too — who the
 * admins are is not something the feed should advertise.
 */
export function toPublicUserDTO(user: User) {
  return {
    id: user.id,
    name: user.name,
    branch: user.branch,
    year: user.year,
    photoUrl: user.photoUrl,
    interests: splitInterests(user.interests),
    reliabilityScore: user.reliabilityScore,
    goalsCompleted: user.goalsCompleted,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * SQLite has no array column, so interests are stored comma-separated.
 *
 * `split` and `join` live next to each other deliberately: they are two halves of one encoding,
 * and a change to one that is not mirrored in the other silently corrupts every profile.
 */
export function splitInterests(interests: string): string[] {
  return interests
    .split(',')
    .map((interest) => interest.trim())
    .filter(Boolean);
}

export function joinInterests(interests: string[]): string {
  return interests
    .map((interest) => interest.trim())
    .filter(Boolean)
    .join(',');
}
