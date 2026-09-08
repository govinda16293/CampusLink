import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { OTP_LENGTH } from '@campuslink/shared';

/**
 * One-time passcode generation and comparison.
 *
 * Codes are generated with `randomInt`, which draws from the CSPRNG — `Math.random()` would make
 * a 6-digit code guessable from a couple of observed samples.
 *
 * Only the SHA-256 hash of a code is ever stored. A 6-digit code has too little entropy for a
 * slow KDF to be worth the cost, but hashing still means a leaked database does not hand over
 * live passcodes, and the short TTL plus the attempt counter carry the actual security weight.
 */
export function generateOtpCode(): string {
  const max = 10 ** OTP_LENGTH;
  return String(randomInt(0, max)).padStart(OTP_LENGTH, '0');
}

export function hashOtpCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/** Constant-time comparison, so response timing does not leak how much of a code was correct. */
export function otpMatches(code: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashOtpCode(code), 'hex');
  const expected = Buffer.from(storedHash, 'hex');
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
