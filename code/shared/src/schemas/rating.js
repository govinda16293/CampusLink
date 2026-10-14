import { z } from 'zod';

/**
 * Body for answering "who turned up?" after a goal is done.
 *
 * A whole group at once rather than one person at a time, because that is how it is answered: a
 * student is shown the three people they went with and taps through them, and one submission
 * either lands or does not. `.strict()` for the usual reason — the rater is the session, never a
 * field in the body.
 */
export const submitRatingsSchema = z
  .object({
    ratings: z
      .array(
        z
          .object({
            subjectId: z.string().min(1, 'Missing who this is about'),
            /** True for "turned up". There is no middle option on purpose. */
            attended: z.boolean(),
          })
          .strict(),
      )
      .min(1, 'Answer for at least one person')
      // A lobby cannot exceed MAX_HEADCOUNT + the poster, so anything past this is not a real
      // group — it is somebody probing the endpoint.
      .max(21, 'That is more people than any lobby can hold'),
  })
  .strict();
