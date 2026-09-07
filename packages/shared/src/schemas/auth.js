import { z } from 'zod';
import { ALLOWED_EMAIL_DOMAIN } from '../enums.js';

/**
 * Validation schemas for the signup / verification / login flow.
 *
 * These live in the shared package so the React forms and the Express handlers enforce exactly
 * the same rules. The client uses them to show inline errors before a request goes out; the API
 * re-validates every payload regardless, because a client-side check is a convenience, never a
 * security boundary.
 */

/** Length of the emailed one-time passcode. */
export const OTP_LENGTH = 6;

/** How long a passcode stays valid. */
export const OTP_TTL_MINUTES = 10;

/** Wrong guesses allowed before a passcode is burned and must be re-sent. */
export const OTP_MAX_ATTEMPTS = 5;

export const MIN_PASSWORD_LENGTH = 8;

/**
 * College email, normalised to lowercase.
 *
 * Restricting to the institute domain is what keeps the platform to actual students — it is the
 * project's only real identity guarantee, so it is enforced here rather than by UI hints.
 */
export const collegeEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .email('Enter a valid email address')
  .refine(
    (email) => email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`),
    `Use your college email (@${ALLOWED_EMAIL_DOMAIN})`,
  );

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(128, 'Password is too long');

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name is required')
    .max(80, 'Name is too long')
    .regex(/^[\p{L}\p{M}'’.\- ]+$/u, 'Name can only contain letters, spaces, hyphens and periods'),
  email: collegeEmailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: collegeEmailSchema,
  // Deliberately not `passwordSchema`: an existing account whose password predates a rule change
  // must still be able to log in. Only signup enforces password strength.
  password: z.string().min(1, 'Password is required'),
});

export const verifyOtpSchema = z.object({
  email: collegeEmailSchema,
  code: z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `Enter the ${OTP_LENGTH}-digit code`),
});

export const resendOtpSchema = z.object({
  email: collegeEmailSchema,
});
