import { z } from 'zod';

/** Long enough to say why you would be good company, short enough to stay a note. */
export const REQUEST_MESSAGE_MAX = 200;

/**
 * Body for asking to join a goal.
 *
 * Deliberately `.strict()` with a single optional field. The status of a request is decided by
 * the poster or by the goal's auto-accept setting, never by the requester, so a body carrying
 * `status: "ACCEPTED"` is refused outright rather than silently ignored.
 */
export const joinRequestSchema = z
  .object({
    message: z
      .string()
      .trim()
      .max(REQUEST_MESSAGE_MAX, `Keep the note under ${REQUEST_MESSAGE_MAX} characters`)
      .optional()
      .default(''),
  })
  .strict();
