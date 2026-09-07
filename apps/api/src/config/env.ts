import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment configuration, validated once at boot.
 *
 * The API refuses to start on invalid configuration rather than failing later at the point of
 * use — a misconfigured deployment should be obvious immediately, not surface as a confusing
 * runtime error three requests in.
 *
 * New variables are added here in the step that first needs them (auth secrets in Step 1, mail
 * transport in Step 1, file storage in Step 7).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required (see apps/api/.env.example)'),

  // --- Auth ---
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // --- Email / OTP ---
  // `console` prints the passcode to the terminal instead of sending mail, so signup works in
  // development without any mail provider credentials.
  MAIL_TRANSPORT: z.enum(['console']).default('console'),
  MAIL_FROM: z.string().default('CampusLink <no-reply@campuslink.local>'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`Invalid environment configuration:\n${issues}\n`);
  console.error('Copy apps/api/.env.example to apps/api/.env and fill it in.');
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

/** CORS_ORIGIN accepts a comma-separated list so preview deployments can be allowed too. */
export const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
