import { z } from 'zod';
import { GENDER_PREFERENCES, GOAL_CATEGORIES } from '../enums.js';

/**
 * Validation for posting and browsing goals.
 *
 * Shared with the API so the create form shows the same errors the server would produce. The API
 * re-validates everything regardless — a client-side check is a convenience, never a boundary.
 */

export const MAX_HEADCOUNT = 20;
export const TITLE_MAX = 80;
export const DESCRIPTION_MAX = 600;

/** How long an undated goal stays on the feed, per the proposal's fulfilment window. */
export const UNDATED_GOAL_TTL_HOURS = 48;

export const createGoalSchema = z.object({
  category: z.enum(GOAL_CATEGORIES),

  title: z
    .string()
    .trim()
    .min(4, 'Give your goal a short title')
    .max(TITLE_MAX, `Keep the title under ${TITLE_MAX} characters`),

  description: z
    .string()
    .trim()
    .min(10, 'Add a little detail so people know what they are joining')
    .max(DESCRIPTION_MAX, `Keep the description under ${DESCRIPTION_MAX} characters`),

  /**
   * ISO timestamp, or null for a "whenever" goal.
   *
   * Rejected if it is in the past: a goal nobody can attend would sit on the feed dragging the
   * fulfilment rate down, and it is almost always a mistyped date rather than an intention.
   */
  dateTime: z
    .string()
    .datetime({ offset: true })
    .refine((value) => new Date(value).getTime() > Date.now() - 60_000, 'Pick a time in the future')
    .nullable()
    .optional(),

  /** People needed to join, not counting the poster. */
  headcount: z
    .number()
    .int()
    .min(1, 'You need at least one other person')
    .max(MAX_HEADCOUNT, `That is more than ${MAX_HEADCOUNT} people`),

  anonymous: z.boolean().optional().default(false),
  genderPreference: z.enum(GENDER_PREFERENCES).optional().default('ANY'),
  autoAccept: z.boolean().optional().default(false),
});

/**
 * Feed query parameters.
 *
 * `cursor` is the id of the last goal already shown. Cursor pagination rather than offset,
 * because the feed is ordered newest-first and new posts arrive constantly — with an offset,
 * a goal posted mid-scroll shifts every later page and the reader sees duplicates.
 */
export const feedQuerySchema = z.object({
  category: z.enum(GOAL_CATEGORIES).optional(),
  /** Calendar day filters, as YYYY-MM-DD. */
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
    .optional(),
  mine: z.enum(['true', 'false']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
