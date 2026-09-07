import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './AppError.js';

export interface AccessTokenPayload {
  /** User id. */
  sub: string;
  /** One of USER_ROLE in packages/shared/src/enums.js. */
  role: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: 'campuslink',
  } as jwt.SignOptions);
}

/**
 * Verifies a token and returns its payload.
 *
 * Every failure mode — expired, wrong signature, malformed, wrong issuer — collapses into the
 * same 401. Distinguishing them in the response would tell an attacker which part of a forged
 * token to fix next.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { issuer: 'campuslink' });
    if (typeof decoded === 'string' || !decoded.sub) {
      throw AppError.unauthorized('Invalid session, please sign in again');
    }
    return {
      sub: String(decoded.sub),
      role: String((decoded as jwt.JwtPayload).role ?? 'STUDENT'),
    };
  } catch {
    throw AppError.unauthorized('Invalid session, please sign in again');
  }
}
