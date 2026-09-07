import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { isTest } from '../../config/env.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import * as authController from './auth.controller.js';

/**
 * Rate limits on the endpoints that are worth attacking.
 *
 * A 6-digit passcode is only safe because guesses are expensive: the per-token attempt counter
 * caps guesses against one code, and this caps how fast codes can be requested or tried at all.
 * Disabled under test so the suite is not throttled by its own fixtures.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many attempts. Please wait a few minutes and try again.',
    },
  },
});

export const authRouter = Router();

authRouter.post('/auth/signup', authLimiter, authController.signup);
authRouter.post('/auth/resend-otp', authLimiter, authController.resendOtp);
authRouter.post('/auth/verify-otp', authLimiter, authController.verifyOtp);
authRouter.post('/auth/login', authLimiter, authController.login);
authRouter.get('/auth/me', requireAuth, authController.me);
