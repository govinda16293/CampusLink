import type { Request, Response } from 'express';
import { loginSchema, resendOtpSchema, signupSchema, verifyOtpSchema } from '@campuslink/shared';
import { AppError } from '../../lib/AppError.js';
import * as authService from './auth.service.js';

/**
 * Controllers do three things and nothing else: validate the payload, call the service, shape the
 * response. Business rules belong in auth.service.ts so they stay testable without HTTP.
 *
 * Schemas are parsed with `.parse()` — a ZodError propagates to the error middleware, which turns
 * it into the field-keyed VALIDATION_ERROR envelope the forms render inline.
 */

export async function signup(req: Request, res: Response) {
  const input = signupSchema.parse(req.body);
  const result = await authService.signup(input);
  res.status(201).json({
    email: result.email,
    message: 'Verification code sent to your college email.',
  });
}

export async function resendOtp(req: Request, res: Response) {
  const { email } = resendOtpSchema.parse(req.body);
  await authService.resendOtp(email);
  // Always the same response, whether or not that address has a pending account.
  res.json({ message: 'If that account needs verifying, a new code is on its way.' });
}

export async function verifyOtp(req: Request, res: Response) {
  const input = verifyOtpSchema.parse(req.body);
  res.json(await authService.verifyOtp(input));
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  res.json(await authService.login(input));
}

export async function me(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  res.json({ user: await authService.getCurrentUser(req.auth.userId) });
}
