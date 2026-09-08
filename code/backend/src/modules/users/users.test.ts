import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../db/prisma.js';
import { resetDatabase, setKnownOtp } from '../../test/helpers.js';

const app = createApp();

beforeEach(resetDatabase);

async function registerVerifiedUser(email: string, name = 'Ashish Bajaj') {
  await request(app)
    .post('/api/auth/signup')
    .send({ name, email, password: 'correct-horse-1' })
    .expect(201);
  await setKnownOtp(email, '123456');
  const res = await request(app).post('/api/auth/verify-otp').send({ email, code: '123456' });
  return { token: res.body.token as string, user: res.body.user };
}

describe('GET /api/users/me', () => {
  it('returns the signed-in student with their completeness score', async () => {
    const { token } = await registerVerifiedUser('a_be24@thapar.edu');
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.user.email).toBe('a_be24@thapar.edu');
    expect(res.body.user.profileCompleteness).toBe(0);
    expect(res.body.user.missingProfileFields).toEqual(['branch', 'year', 'gender', 'interests']);
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });
});

describe('PATCH /api/users/me', () => {
  it('saves the profile and recomputes completeness', async () => {
    const { token } = await registerVerifiedUser('a_be24@thapar.edu');
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ branch: 'CSE', year: 2, gender: 'MALE', interests: ['gym', 'chess'] })
      .expect(200);

    expect(res.body.user.branch).toBe('CSE');
    expect(res.body.user.interests).toEqual(['gym', 'chess']);
    expect(res.body.user.profileCompleteness).toBe(100);
  });

  it('accepts a partial update without clearing untouched fields', async () => {
    const { token } = await registerVerifiedUser('a_be24@thapar.edu');
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).patch('/api/users/me').set(auth).send({ branch: 'CSE' }).expect(200);
    const res = await request(app).patch('/api/users/me').set(auth).send({ year: 3 }).expect(200);

    expect(res.body.user.branch).toBe('CSE');
    expect(res.body.user.year).toBe(3);
  });

  // --- The guard the whole trust layer rests on -------------------------------------------
  it('refuses to let a student set their own reliability score or role', async () => {
    const { token, user } = await registerVerifiedUser('a_be24@thapar.edu');
    const auth = { Authorization: `Bearer ${token}` };

    for (const payload of [
      { reliabilityScore: 999 },
      { role: 'ADMIN' },
      { isVerified: true },
      { goalsCompleted: 50 },
      { email: 'someone_else@thapar.edu' },
      { id: 'some-other-id' },
    ]) {
      const res = await request(app).patch('/api/users/me').set(auth).send(payload).expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }

    // And nothing actually changed in the database.
    const row = await prisma.user.findUnique({ where: { id: user.id } });
    expect(row?.reliabilityScore).toBe(100);
    expect(row?.role).toBe('STUDENT');
    expect(row?.goalsCompleted).toBe(0);
    expect(row?.email).toBe('a_be24@thapar.edu');
  });

  it('rejects a branch outside the enum', async () => {
    const { token } = await registerVerifiedUser('a_be24@thapar.edu');
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ branch: 'HOGWARTS' })
      .expect(400);
    expect(res.body.error.details.branch).toBeTruthy();
  });

  it('rejects an impossible year of study', async () => {
    const { token } = await registerVerifiedUser('a_be24@thapar.edu');
    await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ year: 9 })
      .expect(400);
  });

  it('de-duplicates interests case-insensitively', async () => {
    // Otherwise "Gym" and "gym" would count as two interests for Step 10's matching.
    const { token } = await registerVerifiedUser('a_be24@thapar.edu');
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ interests: ['Gym', 'gym', 'GYM', 'chess'] })
      .expect(200);
    expect(res.body.user.interests).toEqual(['Gym', 'chess']);
  });

  it('survives a round-trip through comma-separated storage', async () => {
    const { token } = await registerVerifiedUser('a_be24@thapar.edu');
    const auth = { Authorization: `Bearer ${token}` };
    await request(app)
      .patch('/api/users/me')
      .set(auth)
      .send({ interests: ['table tennis', 'late-night maggi'] })
      .expect(200);

    const res = await request(app).get('/api/users/me').set(auth).expect(200);
    expect(res.body.user.interests).toEqual(['table tennis', 'late-night maggi']);
  });
});

describe('GET /api/users/:id', () => {
  it('never exposes another student’s email', async () => {
    const alice = await registerVerifiedUser('alice_be24@thapar.edu', 'Alice Sharma');
    const bob = await registerVerifiedUser('bob_be24@thapar.edu', 'Bob Singh');

    const res = await request(app)
      .get(`/api/users/${alice.user.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .expect(200);

    expect(res.body.user.name).toBe('Alice Sharma');
    expect(res.body.user).not.toHaveProperty('email');
    expect(res.body.user).not.toHaveProperty('role');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('returns the full private profile when you ask for your own id', async () => {
    const { token, user } = await registerVerifiedUser('a_be24@thapar.edu');
    const res = await request(app)
      .get(`/api/users/${user.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.user.email).toBe('a_be24@thapar.edu');
  });

  it('404s for a student who does not exist', async () => {
    const { token } = await registerVerifiedUser('a_be24@thapar.edu');
    await request(app).get('/api/users/nope').set('Authorization', `Bearer ${token}`).expect(404);
  });
});

describe('profile routes require authentication', () => {
  it('401s without a token', async () => {
    await request(app).get('/api/users/me').expect(401);
    await request(app).patch('/api/users/me').send({ branch: 'CSE' }).expect(401);
    await request(app).get('/api/users/someone').expect(401);
  });
});

describe('profile photo', () => {
  // A one-pixel JPEG, enough to exercise the real decode/store/serve path.
  const JPEG_1PX =
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
    'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
    'AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
  const dataUrl = `data:image/jpeg;base64,${JPEG_1PX}`;

  it('stores a photo and exposes a URL rather than the bytes', async () => {
    const { token, user } = await registerVerifiedUser('a_be24@thapar.edu');
    const auth = { Authorization: `Bearer ${token}` };

    expect(user.photoUrl).toBeNull();

    const res = await request(app)
      .post('/api/users/me/photo')
      .set(auth)
      .send({ dataUrl })
      .expect(200);

    // The DTO must carry a URL, never the image itself — a feed of twenty cards would otherwise
    // inline twenty images into one response.
    expect(res.body.user.photoUrl).toContain(`/api/users/${user.id}/photo`);
    expect(JSON.stringify(res.body)).not.toContain(JPEG_1PX);
  });

  it('serves the bytes with the right media type and a cache header', async () => {
    const { token, user } = await registerVerifiedUser('a_be24@thapar.edu');
    await request(app)
      .post('/api/users/me/photo')
      .set('Authorization', `Bearer ${token}`)
      .send({ dataUrl })
      .expect(200);

    const res = await request(app).get(`/api/users/${user.id}/photo`).expect(200);
    expect(res.headers['content-type']).toContain('image/jpeg');
    expect(res.headers['cache-control']).toContain('immutable');
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('rejects an SVG, which could carry script', async () => {
    // The bytes are served straight back to a browser, so this one matters.
    const { token } = await registerVerifiedUser('a_be24@thapar.edu');
    await request(app)
      .post('/api/users/me/photo')
      .set('Authorization', `Bearer ${token}`)
      .send({ dataUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' })
      .expect(400);
  });

  it('rejects a remote URL instead of an upload', async () => {
    const { token } = await registerVerifiedUser('a_be24@thapar.edu');
    await request(app)
      .post('/api/users/me/photo')
      .set('Authorization', `Bearer ${token}`)
      .send({ dataUrl: 'https://example.com/avatar.jpg' })
      .expect(400);
  });

  it('removes a photo', async () => {
    const { token, user } = await registerVerifiedUser('a_be24@thapar.edu');
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).post('/api/users/me/photo').set(auth).send({ dataUrl }).expect(200);

    const res = await request(app).delete('/api/users/me/photo').set(auth).expect(200);
    expect(res.body.user.photoUrl).toBeNull();
    await request(app).get(`/api/users/${user.id}/photo`).expect(404);
  });

  it('404s for a student with no photo', async () => {
    const { user } = await registerVerifiedUser('a_be24@thapar.edu');
    await request(app).get(`/api/users/${user.id}/photo`).expect(404);
  });

  it('requires authentication to upload', async () => {
    await request(app).post('/api/users/me/photo').send({ dataUrl }).expect(401);
    await request(app).delete('/api/users/me/photo').expect(401);
  });
});
