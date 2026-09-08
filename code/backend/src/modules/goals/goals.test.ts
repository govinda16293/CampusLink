import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../db/prisma.js';
import { resetDatabase, setKnownOtp } from '../../test/helpers.js';

const app = createApp();

beforeEach(resetDatabase);

async function registerVerifiedUser(email: string, name = 'Test Student') {
  await request(app)
    .post('/api/auth/signup')
    .send({ name, email, password: 'correct-horse-1' })
    .expect(201);
  await setKnownOtp(email, '123456');
  const res = await request(app).post('/api/auth/verify-otp').send({ email, code: '123456' });
  return {
    token: res.body.token as string,
    user: res.body.user,
    auth: { Authorization: `Bearer ${res.body.token}` },
  };
}

const GOAL = {
  category: 'GYM',
  title: 'Gym partner for 6am',
  description: 'Looking for someone to keep me accountable at the gym before class.',
  headcount: 1,
};

describe('POST /api/goals', () => {
  it('creates a goal and returns it', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const res = await request(app).post('/api/goals').set(poster.auth).send(GOAL).expect(201);

    expect(res.body.goal.title).toBe(GOAL.title);
    expect(res.body.goal.spotsLeft).toBe(1);
    expect(res.body.goal.isOwnGoal).toBe(true);
    expect(res.body.goal.status).toBe('OPEN');
  });

  it('gives an undated goal a 48-hour expiry', async () => {
    // Otherwise "whenever" goals accumulate on the feed forever and drag the fulfilment metric.
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const res = await request(app).post('/api/goals').set(poster.auth).send(GOAL).expect(201);

    const hours = (new Date(res.body.goal.expiresAt).getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(47);
    expect(hours).toBeLessThan(49);
  });

  it('rejects a goal scheduled in the past', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    await request(app)
      .post('/api/goals')
      .set(poster.auth)
      .send({ ...GOAL, dateTime: new Date(Date.now() - 86_400_000).toISOString() })
      .expect(400);
  });

  it('rejects an unknown category and a zero headcount', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    await request(app)
      .post('/api/goals')
      .set(poster.auth)
      .send({ ...GOAL, category: 'PARTY' })
      .expect(400);
    await request(app)
      .post('/api/goals')
      .set(poster.auth)
      .send({ ...GOAL, headcount: 0 })
      .expect(400);
  });

  it('requires authentication', async () => {
    await request(app).post('/api/goals').send(GOAL).expect(401);
  });
});

// ---------------------------------------------------------------------------------------------
// The trust layer. If these fail, anonymous posting is broken and the feature is worse than
// useless — a poster would believe they were hidden while their name was on the wire.
// ---------------------------------------------------------------------------------------------
describe('anonymous posting', () => {
  it('hides the poster’s name, photo and id from other students on the feed', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu', 'Anon Poster');
    const viewer = await registerVerifiedUser('viewer_be24@thapar.edu', 'Curious Viewer');

    await request(app)
      .post('/api/goals')
      .set(poster.auth)
      .send({ ...GOAL, anonymous: true })
      .expect(201);

    const res = await request(app).get('/api/goals').set(viewer.auth).expect(200);
    const [goal] = res.body.goals;

    expect(goal.poster.isAnonymous).toBe(true);
    expect(goal.poster.name).toBeUndefined();
    expect(goal.poster.id).toBeUndefined();
    expect(goal.poster.photoUrl).toBeUndefined();

    // The strongest assertion: the identity is not anywhere in the payload, under any key.
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('Anon Poster');
    expect(body).not.toContain(poster.user.id);
    expect(body).not.toContain('poster_be24@thapar.edu');
  });

  it('still shows the reliability score while anonymous', async () => {
    // Per §3.3: a requester must be able to judge trustworthiness without knowing who it is.
    const poster = await registerVerifiedUser('poster_be24@thapar.edu', 'Anon Poster');
    const viewer = await registerVerifiedUser('viewer_be24@thapar.edu');

    await request(app)
      .post('/api/goals')
      .set(poster.auth)
      .send({ ...GOAL, anonymous: true })
      .expect(201);
    const res = await request(app).get('/api/goals').set(viewer.auth).expect(200);

    expect(res.body.goals[0].poster.reliabilityScore).toBe(100);
    expect(res.body.goals[0].poster.goalsCompleted).toBe(0);
  });

  it('shows the poster their own identity on their own anonymous goal', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu', 'Anon Poster');
    await request(app)
      .post('/api/goals')
      .set(poster.auth)
      .send({ ...GOAL, anonymous: true })
      .expect(201);

    const res = await request(app).get('/api/goals').set(poster.auth).expect(200);
    expect(res.body.goals[0].poster.isAnonymous).toBe(false);
    expect(res.body.goals[0].poster.name).toBe('Anon Poster');
  });

  it('hides identity on the single-goal endpoint too, not just the feed', async () => {
    // A serializer applied on the list but forgotten on the detail route is the obvious way for
    // this to leak, so it is asserted separately.
    const poster = await registerVerifiedUser('poster_be24@thapar.edu', 'Anon Poster');
    const viewer = await registerVerifiedUser('viewer_be24@thapar.edu');

    const created = await request(app)
      .post('/api/goals')
      .set(poster.auth)
      .send({ ...GOAL, anonymous: true })
      .expect(201);

    const res = await request(app)
      .get(`/api/goals/${created.body.goal.id}`)
      .set(viewer.auth)
      .expect(200);

    expect(res.body.goal.poster.isAnonymous).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain('Anon Poster');
  });

  it('shows the poster normally when the goal is not anonymous', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu', 'Open Poster');
    const viewer = await registerVerifiedUser('viewer_be24@thapar.edu');

    await request(app).post('/api/goals').set(poster.auth).send(GOAL).expect(201);
    const res = await request(app).get('/api/goals').set(viewer.auth).expect(200);

    expect(res.body.goals[0].poster.isAnonymous).toBe(false);
    expect(res.body.goals[0].poster.name).toBe('Open Poster');
    // Even unmasked, another student's email is never exposed.
    expect(res.body.goals[0].poster.email).toBeUndefined();
  });
});

describe('GET /api/goals — the feed', () => {
  async function seed(
    auth: Record<string, string>,
    goals: Array<Partial<typeof GOAL> & Record<string, unknown>>,
  ) {
    for (const goal of goals) {
      await request(app)
        .post('/api/goals')
        .set(auth)
        .send({ ...GOAL, ...goal })
        .expect(201);
    }
  }

  it('returns newest first', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    await seed(poster.auth, [{ title: 'First goal here' }, { title: 'Second goal here' }]);

    const res = await request(app).get('/api/goals').set(poster.auth).expect(200);
    expect(res.body.goals.map((g: { title: string }) => g.title)).toEqual([
      'Second goal here',
      'First goal here',
    ]);
  });

  it('filters by category', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    await seed(poster.auth, [{ category: 'GYM' }, { category: 'STUDY' }, { category: 'STUDY' }]);

    const res = await request(app).get('/api/goals?category=STUDY').set(poster.auth).expect(200);
    expect(res.body.goals).toHaveLength(2);
    expect(res.body.goals.every((g: { category: string }) => g.category === 'STUDY')).toBe(true);
  });

  it('paginates with a cursor and does not repeat rows', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    await seed(
      poster.auth,
      Array.from({ length: 5 }, (_, i) => ({ title: `Goal number ${i}` })),
    );

    const first = await request(app).get('/api/goals?limit=2').set(poster.auth).expect(200);
    expect(first.body.goals).toHaveLength(2);
    expect(first.body.nextCursor).toBeTruthy();

    const second = await request(app)
      .get(`/api/goals?limit=2&cursor=${first.body.nextCursor}`)
      .set(poster.auth)
      .expect(200);

    const firstIds = first.body.goals.map((g: { id: string }) => g.id);
    const secondIds = second.body.goals.map((g: { id: string }) => g.id);
    expect(secondIds.some((id: string) => firstIds.includes(id))).toBe(false);
  });

  it('hides expired goals even before the archiving job has run', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const created = await request(app).post('/api/goals').set(poster.auth).send(GOAL).expect(201);

    await prisma.goal.update({
      where: { id: created.body.goal.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await request(app).get('/api/goals').set(poster.auth).expect(200);
    expect(res.body.goals).toHaveLength(0);
  });

  it('can be filtered to only my own goals', async () => {
    const mine = await registerVerifiedUser('mine_be24@thapar.edu');
    const other = await registerVerifiedUser('other_be24@thapar.edu');
    await seed(mine.auth, [{ title: 'My own goal here' }]);
    await seed(other.auth, [{ title: 'Someone elses goal' }]);

    const res = await request(app).get('/api/goals?mine=true').set(mine.auth).expect(200);
    expect(res.body.goals).toHaveLength(1);
    expect(res.body.goals[0].title).toBe('My own goal here');
  });

  it('requires authentication', async () => {
    await request(app).get('/api/goals').expect(401);
  });
});

describe('DELETE /api/goals/:id', () => {
  it('lets the poster cancel, and drops it from the feed', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const created = await request(app).post('/api/goals').set(poster.auth).send(GOAL).expect(201);

    await request(app).delete(`/api/goals/${created.body.goal.id}`).set(poster.auth).expect(200);

    const feed = await request(app).get('/api/goals').set(poster.auth).expect(200);
    expect(feed.body.goals).toHaveLength(0);

    // The row survives, because Step 11's fulfilment metric needs to know how it ended.
    expect(await prisma.goal.count()).toBe(1);
  });

  it('refuses to let another student cancel your goal', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const other = await registerVerifiedUser('other_be24@thapar.edu');
    const created = await request(app).post('/api/goals').set(poster.auth).send(GOAL).expect(201);

    await request(app).delete(`/api/goals/${created.body.goal.id}`).set(other.auth).expect(403);
  });
});
