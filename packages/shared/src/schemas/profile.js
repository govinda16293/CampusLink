import { z } from 'zod';
import { BRANCHES, GENDERS, STUDY_YEARS } from '../enums.js';

/**
 * Validation for the profile form.
 *
 * Shared with the API so the inline errors a student sees match what the server would say. Note
 * what is deliberately absent: `email`, `role`, `isVerified`, `reliabilityScore` and
 * `goalsCompleted`. Those are server-controlled, and the whole trust layer rests on a student
 * being unable to set their own reliability score — leaving them out of the schema is the first
 * of two guards, the second being an explicit field allow-list in the service.
 */

export const MAX_INTERESTS = 10;
export const MAX_INTEREST_LENGTH = 24;

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name is required')
  .max(80, 'Name is too long')
  .regex(/^[\p{L}\p{M}'’.\- ]+$/u, 'Name can only contain letters, spaces, hyphens and periods');

/**
 * Free-text interest tags, normalised so matching in Step 10 is not defeated by casing or
 * duplicates ("Gym" and "gym" must count as one interest, not two).
 */
export const interestsSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, 'An interest cannot be empty')
      .max(MAX_INTEREST_LENGTH, `Keep each interest under ${MAX_INTEREST_LENGTH} characters`)
      // Commas are the storage separator, so one inside a tag would split it into two on read.
      .regex(/^[^,]+$/, 'An interest cannot contain a comma'),
  )
  .max(MAX_INTERESTS, `You can add up to ${MAX_INTERESTS} interests`)
  .transform((interests) => {
    const seen = new Set();
    return interests.filter((interest) => {
      const key = interest.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

/**
 * Every field is optional so the form can PATCH just what changed.
 *
 * `.strict()` rejects unknown keys outright rather than ignoring them — if someone posts
 * `{ reliabilityScore: 100 }` the request fails loudly instead of appearing to succeed.
 */
export const updateProfileSchema = z
  .object({
    name: nameSchema.optional(),
    branch: z.enum(BRANCHES).nullable().optional(),
    year: z
      .number()
      .int()
      .refine((year) => STUDY_YEARS.includes(year), 'Select a valid year of study')
      .nullable()
      .optional(),
    gender: z.enum(GENDERS).optional(),
    interests: interestsSchema.optional(),
  })
  .strict();
