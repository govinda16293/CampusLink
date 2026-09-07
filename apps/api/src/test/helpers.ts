import { prisma } from '../db/prisma.js';

/**
 * Empties every table between tests.
 *
 * Each test gets a clean database so they can run in any order and none depends on rows another
 * one happened to leave behind. Tables are listed newest-dependency-first for when foreign keys
 * arrive in later steps.
 */
export async function resetDatabase() {
  await prisma.goal.deleteMany();
  await prisma.otpToken.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * Reads back the passcode that was just issued for an address.
 *
 * Tests cannot see the console transport's output, and the stored value is a hash, so the code
 * itself is unrecoverable by design. Instead a test overwrites the stored hash with the hash of
 * a code it chooses — exercising the real verification path, including the attempt counter.
 */
export async function setKnownOtp(email: string, code: string) {
  const { hashOtpCode } = await import('../lib/otp.js');
  const token = await prisma.otpToken.findFirst({
    where: { email, purpose: 'SIGNUP', consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!token) throw new Error(`No pending OTP for ${email}`);
  await prisma.otpToken.update({ where: { id: token.id }, data: { codeHash: hashOtpCode(code) } });
  return token;
}
