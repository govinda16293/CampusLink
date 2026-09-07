import type { User } from '@prisma/client';

/**
 * Turns database rows into the shapes the API is allowed to return.
 *
 * Nothing else in the codebase may put a User onto a response. Routing every user through here
 * means `passwordHash` cannot leak by someone forgetting to strip it, and it is the same choke
 * point that will enforce anonymous posting in Step 3 — one place to audit, not dozens.
 */

/** The full profile, returned only to the user themselves. */
export function toPrivateUserDTO(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isVerified: user.isVerified,
    branch: user.branch,
    year: user.year,
    gender: user.gender,
    hostelBlock: user.hostelBlock,
    photoUrl: user.photoUrl,
    interests: splitInterests(user.interests),
    role: user.role,
    reliabilityScore: user.reliabilityScore,
    goalsCompleted: user.goalsCompleted,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * What any other student may see about a user.
 *
 * Email is deliberately absent: it is the one field that identifies a real person off-platform,
 * and nothing in the product needs another student to know it.
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
  };
}

/** SQLite has no array column, so interests are stored comma-separated. */
export function splitInterests(interests: string): string[] {
  return interests
    .split(',')
    .map((interest) => interest.trim())
    .filter(Boolean);
}
