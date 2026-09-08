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
  // `console` prints the passcode to the terminal, so signup works with no credentials at all.
  // `smtp` sends real mail through any SMTP server (Gmail, Outlook, Brevo, SendGrid, Mailtrap).
  MAIL_TRANSPORT: z.enum(['console', 'smtp']).default('console'),
  MAIL_FROM: z.string().default('CampusLink <no-reply@campuslink.local>'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  // Port 465 speaks TLS from the first byte; 587 starts plaintext and upgrades via STARTTLS.
  // Getting this wrong is the most common cause of a connection that just hangs.
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

/**
 * SMTP credentials are only required when SMTP is actually the chosen transport.
 *
 * Checking this at boot rather than at send time matters: the alternative is a signup that
 * appears to succeed and silently never delivers a passcode, which is far harder to diagnose
 * than a server that refuses to start and says exactly which variable is missing.
 */
const configSchema = envSchema.superRefine((config, ctx) => {
  if (config.MAIL_TRANSPORT !== 'smtp') return;

  for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'] as const) {
    if (!config[key]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} is required when MAIL_TRANSPORT=smtp`,
      });
    }
  }
});

const parsed = configSchema.safeParse(process.env);

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
