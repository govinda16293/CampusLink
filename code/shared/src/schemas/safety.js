import { z } from 'zod';
import { REPORT_REASONS, REPORT_STATUSES } from '../enums.js';

export const REPORT_DETAIL_MAX = 1000;

/**
 * Body for reporting somebody.
 *
 * Note what is *not* here: who is being reported. A report filed from a goal names that goal, and
 * the server resolves the poster itself. That is not a convenience — an anonymous goal's poster is
 * unknown to the reporter by design, so a client-supplied subject id would either be impossible to
 * provide or a way to report somebody you had worked out by other means.
 */
export const createReportSchema = z
  .object({
    reason: z.enum(REPORT_REASONS),
    detail: z
      .string()
      .trim()
      .max(REPORT_DETAIL_MAX, `Keep it under ${REPORT_DETAIL_MAX} characters`)
      .optional()
      .default(''),
    /** Context, when reporting from a goal or a message rather than from a profile. */
    goalId: z.string().min(1).optional(),
    messageId: z.string().min(1).optional(),
    /** Only when reporting straight from a profile, where there is no goal to resolve. */
    userId: z.string().min(1).optional(),
  })
  .strict()
  .refine(
    (value) => Boolean(value.goalId || value.messageId || value.userId),
    'A report must name a goal, a message or a student',
  );

/** An admin moving a report along. */
export const reviewReportSchema = z
  .object({
    status: z.enum(REPORT_STATUSES.filter((status) => status !== 'OPEN')),
    note: z.string().trim().max(REPORT_DETAIL_MAX).optional().default(''),
  })
  .strict();
