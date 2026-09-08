import { describe, expect, it } from 'vitest';
import { OTP_LENGTH } from '@campuslink/shared';
import { generateOtpCode, hashOtpCode, otpMatches } from './otp.js';

describe('one-time passcodes', () => {
  it('generates a code of exactly the advertised length', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateOtpCode()).toMatch(new RegExp(`^\\d{${OTP_LENGTH}}$`));
    }
  });

  it('keeps leading zeros', () => {
    // A naive String(randomInt()) drops them and produces 5-digit codes that fail validation.
    const codes = Array.from({ length: 500 }, generateOtpCode);
    expect(codes.every((code) => code.length === OTP_LENGTH)).toBe(true);
  });

  it('does not repeat itself constantly', () => {
    const codes = new Set(Array.from({ length: 200 }, generateOtpCode));
    expect(codes.size).toBeGreaterThan(150);
  });

  it('matches a correct code against its hash', () => {
    const code = generateOtpCode();
    expect(otpMatches(code, hashOtpCode(code))).toBe(true);
  });

  it('rejects a wrong code, and a malformed stored hash', () => {
    expect(otpMatches('000000', hashOtpCode('111111'))).toBe(false);
    expect(otpMatches('000000', 'garbage')).toBe(false);
  });
});
