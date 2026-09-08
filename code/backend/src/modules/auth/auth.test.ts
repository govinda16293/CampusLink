import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { OTP_MAX_ATTEMPTS } from '@campuslink/shared';
import { createApp } from '../../app.js';
import { prisma } from '../../db/prisma.js';
import { resetDatabase, setKnownOtp } from '../../test/helpers.js';

const app = createApp();

const VALID = { name: 'Ashish Bajaj', email: 'test_be24@thapar.edu', password: 'correct-horse-1' };

beforeEach(resetDatabase);

/** Signs up and verifies an account, returning its session token. */
async function registerVerifiedUser(overrides: Partial<typeof VALID> = {}) {
  const user = { ...VALID, ...overrides };
  await request(app).post('/api/auth/signup').send(user).expect(201);
  await setKnownOtp(user.email, '123456');
  const res = await request(app)
    .post('/api/auth/verify-otp')
    .send({ email: user.email, code: '123456' })
    .expect(200);
  return { token: res.body.token as string, user: res.body.user };
}

describe('POST /api/auth/signup', () => {
  it('creates an unverified account and issues a passcode', async () => {
    const res = await request(app).post('/api/auth/signup').send(VALID).expect(201);

    expect(res.body.email).toBe(VALID.email);
    const user = await prisma.user.findUnique({ where: { email: VALID.email } });
    expect(user?.isVerified).toBe(false);
    expect(await prisma.otpToken.count({ where: { email: VALID.email } })).toBe(1);
  });

  it('never stores the password in plaintext', async () => {
    await request(app).post('/api/auth/signup').send(VALID).expect(201);
    const user = await prisma.user.findUnique({ where: { email: VALID.email } });
    expect(user?.passwordHash).not.toContain(VALID.password);
    expect(user?.passwordHash.startsWith('scrypt$')).toBe(true);
  });

  it('rejects an email outside the college domain', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...VALID, email: 'someone@gmail.com' })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.email).toContain('thapar.edu');
  });

  it('rejects a short password', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...VALID, password: 'short' })
      .expect(400);
    expect(res.body.error.details.password).toBeTruthy();
  });

  it('normalises the email to lowercase, so casing cannot create a second account', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ ...VALID, email: 'TEST_BE24@Thapar.edu' })
      .expect(201);
    expect(await prisma.user.count({ where: { email: 'test_be24@thapar.edu' } })).toBe(1);
  });

  it('treats a repeat signup on an unverified address as a resend, not an error', async () => {
    await request(app).post('/api/auth/signup').send(VALID).expect(201);
    await request(app).post('/api/auth/signup').send(VALID).expect(201);

    // Exactly one passcode stays live — the older one is replaced, not accumulated.
    expect(await prisma.otpToken.count({ where: { email: VALID.email } })).toBe(1);
    expect(await prisma.user.count()).toBe(1);
  });

  it('refuses to overwrite an already-verified account', async () => {
    await registerVerifiedUser();
    const res = await request(app).post('/api/auth/signup').send(VALID).expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });
});

describe('POST /api/auth/verify-otp', () => {
  it('verifies the account and returns a session token', async () => {
    const { token, user } = await registerVerifiedUser();

    expect(token).toBeTruthy();
    expect(user.isVerified).toBe(true);
    expect(user.email).toBe(VALID.email);
  });

  it('never returns the password hash', async () => {
    const { user } = await registerVerifiedUser();
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('consumes the passcode, so the same code cannot be replayed', async () => {
    await registerVerifiedUser();
    expect(await prisma.otpToken.count({ where: { email: VALID.email } })).toBe(0);
  });

  it('rejects a wrong code and counts the attempt', async () => {
    await request(app).post('/api/auth/signup').send(VALID).expect(201);
    await setKnownOtp(VALID.email, '123456');

    await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: VALID.email, code: '999999' })
      .expect(400);

    const token = await prisma.otpToken.findFirst({ where: { email: VALID.email } });
    expect(token?.attempts).toBe(1);
    const user = await prisma.user.findUnique({ where: { email: VALID.email } });
    expect(user?.isVerified).toBe(false);
  });

  it('burns the passcode after too many wrong guesses', async () => {
    // This is what keeps a 6-digit code from being brute-forced inside its 10-minute window.
    await request(app).post('/api/auth/signup').send(VALID).expect(201);
    await setKnownOtp(VALID.email, '123456');

    for (let i = 0; i < OTP_MAX_ATTEMPTS; i += 1) {
      await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: VALID.email, code: '999999' })
        .expect(400);
    }

    // Even the correct code is now refused.
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: VALID.email, code: '123456' })
      .expect(400);
    expect(res.body.error.message).toContain('Too many');
  });

  it('rejects an expired passcode', async () => {
    await request(app).post('/api/auth/signup').send(VALID).expect(201);
    const token = await setKnownOtp(VALID.email, '123456');
    await prisma.otpToken.update({
      where: { id: token.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: VALID.email, code: '123456' })
      .expect(400);
    expect(res.body.error.message).toContain('expired');
  });

  it('gives nothing away about an address that never signed up', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'nobody_be24@thapar.edu', code: '123456' })
      .expect(400);
    expect(res.body.error.message).toBe('That code is not valid. Request a new one.');
  });
});

describe('POST /api/auth/login', () => {
  it('returns a token for correct credentials', async () => {
    await registerVerifiedUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID.email, password: VALID.password })
      .expect(200);

    expect(res.body.token).toBeTruthy();
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('gives the same message for a wrong password and an unknown account', async () => {
    // Different messages here would let anyone test which students have signed up.
    await registerVerifiedUser();

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID.email, password: 'wrong-password' })
      .expect(401);

    const unknownUser = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost_be24@thapar.edu', password: 'wrong-password' })
      .expect(401);

    expect(wrongPassword.body.error.message).toBe(unknownUser.body.error.message);
  });

  it('refuses an unverified account, and says why', async () => {
    await request(app).post('/api/auth/signup').send(VALID).expect(201);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID.email, password: VALID.password })
      .expect(403);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });
});

describe('GET /api/auth/me', () => {
  it('returns the signed-in user', async () => {
    const { token } = await registerVerifiedUser();
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.user.email).toBe(VALID.email);
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('rejects a missing, malformed or forged token the same way', async () => {
    await request(app).get('/api/auth/me').expect(401);
    await request(app).get('/api/auth/me').set('Authorization', 'Bearer nonsense').expect(401);
    await request(app).get('/api/auth/me').set('Authorization', 'Basic abc').expect(401);
  });

  it('rejects a valid token whose account has been deleted', async () => {
    const { token } = await registerVerifiedUser();
    await prisma.user.deleteMany();
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(401);
  });
});

describe('POST /api/auth/resend-otp', () => {
  it('responds identically for a real pending account and an unknown address', async () => {
    await request(app).post('/api/auth/signup').send(VALID).expect(201);

    const real = await request(app)
      .post('/api/auth/resend-otp')
      .send({ email: VALID.email })
      .expect(200);
    const fake = await request(app)
      .post('/api/auth/resend-otp')
      .send({ email: 'nobody_be24@thapar.edu' })
      .expect(200);

    expect(real.body.message).toBe(fake.body.message);
    expect(await prisma.otpToken.count({ where: { email: 'nobody_be24@thapar.edu' } })).toBe(0);
  });
});
