import { OTP_MAX_ATTEMPTS, OTP_TTL_MINUTES } from '@campuslink/shared';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../lib/AppError.js';
import { signAccessToken } from '../../lib/jwt.js';
import { generateOtpCode, hashOtpCode, otpMatches } from '../../lib/otp.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { mailSender } from '../../services/mail/index.js';
import { verificationEmail } from '../../services/mail/templates.js';
import { toPrivateUserDTO } from '../../serializers/user.serializer.js';

const SIGNUP_PURPOSE = 'SIGNUP';

/**
 * Issues a fresh passcode for an email and sends it.
 *
 * Any earlier unconsumed passcode for the same purpose is deleted first, so exactly one code is
 * ever live per address. Without that, a user who clicks "resend" three times would have three
 * valid codes, which triples the guessing surface for no benefit.
 */
async function issueOtp(email: string, name: string): Promise<void> {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

  await prisma.$transaction([
    prisma.otpToken.deleteMany({ where: { email, purpose: SIGNUP_PURPOSE } }),
    prisma.otpToken.create({
      data: { email, codeHash: hashOtpCode(code), purpose: SIGNUP_PURPOSE, expiresAt },
    }),
  ]);

  const { text, html } = verificationEmail(name, code);

  try {
    await mailSender.send({
      to: email,
      subject: `${code} is your CampusLink verification code`,
      text,
      html,
    });
  } catch (error) {
    // The passcode row is already committed, so a delivery failure would otherwise leave the
    // user staring at a code-entry screen for a code that was never sent. Remove it and say so.
    console.error(`[mail] failed to deliver passcode to ${email}`, error);
    await prisma.otpToken.deleteMany({ where: { email, purpose: SIGNUP_PURPOSE } });
    throw new AppError(
      502,
      'MAIL_DELIVERY_FAILED',
      'We could not send the verification email. Please try again in a moment.',
    );
  }
}

/**
 * Registers an account and sends a verification code.
 *
 * A repeat signup for an address that exists but is still unverified is treated as "resend",
 * not as an error — that is the common case of someone closing the tab before typing the code,
 * and failing them would leave the address permanently unusable.
 */
export async function signup(input: { name: string; email: string; password: string }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });

  if (existing?.isVerified) {
    throw AppError.conflict('An account with this email already exists. Try signing in instead.');
  }

  const passwordHash = await hashPassword(input.password);

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { name: input.name, passwordHash },
    });
  } else {
    await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash },
    });
  }

  await issueOtp(input.email, input.name);
  return { email: input.email };
}

/** Re-sends a passcode. Silent for unknown or already-verified addresses — see below. */
export async function resendOtp(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Deliberately not an error. Responding differently for "no such account" would turn this
  // endpoint into a way to test whether any given person has signed up.
  if (user && !user.isVerified) {
    await issueOtp(email, user.name);
  }
}

/**
 * Confirms a passcode and, on success, verifies the account and returns a session.
 *
 * Wrong guesses increment a counter and the passcode is burned once it runs out, which is what
 * stops a 6-digit code from being brute-forced within its 10-minute window.
 */
export async function verifyOtp(input: { email: string; code: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw AppError.badRequest('That code is not valid. Request a new one.');

  if (user.isVerified) {
    throw AppError.conflict('This account is already verified. Please sign in.');
  }

  const token = await prisma.otpToken.findFirst({
    where: { email: input.email, purpose: SIGNUP_PURPOSE, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!token) throw AppError.badRequest('That code is not valid. Request a new one.');

  if (token.expiresAt.getTime() < Date.now()) {
    await prisma.otpToken.delete({ where: { id: token.id } });
    throw AppError.badRequest('That code has expired. Request a new one.');
  }

  if (token.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.otpToken.delete({ where: { id: token.id } });
    throw AppError.badRequest('Too many incorrect attempts. Request a new code.');
  }

  if (!otpMatches(input.code, token.codeHash)) {
    const { attempts } = await prisma.otpToken.update({
      where: { id: token.id },
      data: { attempts: { increment: 1 } },
    });
    const remaining = Math.max(0, OTP_MAX_ATTEMPTS - attempts);
    throw AppError.badRequest(
      remaining > 0
        ? `That code is not correct. ${remaining} attempt${remaining === 1 ? '' : 's'} left.`
        : 'Too many incorrect attempts. Request a new code.',
    );
  }

  const [verifiedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, verifiedAt: new Date() },
    }),
    prisma.otpToken.deleteMany({ where: { email: input.email, purpose: SIGNUP_PURPOSE } }),
  ]);

  return {
    token: signAccessToken({ sub: verifiedUser.id, role: verifiedUser.role }),
    user: toPrivateUserDTO(verifiedUser),
  };
}

/**
 * Exchanges credentials for a session token.
 *
 * A wrong email and a wrong password return the identical message on purpose, so the endpoint
 * cannot be used to enumerate which students have accounts.
 */
export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw AppError.unauthorized('Incorrect email or password');
  }

  if (!user.isVerified) {
    throw new AppError(
      403,
      'EMAIL_NOT_VERIFIED',
      'Verify your college email before signing in. We can send you a new code.',
    );
  }

  return {
    token: signAccessToken({ sub: user.id, role: user.role }),
    user: toPrivateUserDTO(user),
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  // The token verified, but the row is gone — a deleted account holding a still-valid JWT.
  if (!user) throw AppError.unauthorized('Your account no longer exists');
  return toPrivateUserDTO(user);
}
