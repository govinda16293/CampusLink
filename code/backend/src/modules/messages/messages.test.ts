import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../db/prisma.js';
import { resetDatabase, setKnownOtp } from '../../test/helpers.js';

/**
 * Step 6 — the lobby chat over HTTP.
 *
 * The socket layer is tested separately. These are the tests that matter most either way: the
 * chat is the one place on CampusLink where students write to each other in their own words, and
 * the only question worth asking first is who can read it.
 */

/*
 * One listening server for the whole file, not one per request.
 *
 * `request(server)` makes supertest bind a fresh ephemeral server for every single call, and this
 * suite makes thousands of them. That churn produced an intermittent "socket hang up" on a random
 * test roughly one run in five — never reproducible for a file on its own. Handing supertest a
 * server that is already listening reuses one socket for the file instead.
 */
const app = createApp();
const server = app.listen(0);
afterAll(() => {
  server.close();
});

beforeEach(resetDatabase);

type Student = { id: string; auth: { Authorization: string } };

async function registerVerifiedUser(email: string, name = 'Test Student'): Promise<Student> {
  await request(server)
    .post('/api/auth/signup')
    .send({ name, email, password: 'correct-horse-1' })
    .expect(201);
  await setKnownOtp(email, '123456');
  const res = await request(server).post('/api/auth/verify-otp').send({ email, code: '123456' });
  return { id: res.body.user.id, auth: { Authorization: `Bearer ${res.body.token}` } };
}

const GOAL = {
  category: 'STUDY',
  title: 'DBMS revision before the quiz',
  description: 'Going through transactions and normalisation in the library on Saturday.',
  headcount: 2,
};

async function postGoal(poster: Student, overrides: Record<string, unknown> = {}) {
  const res = await request(server)
    .post('/api/goals')
    .set(poster.auth)
    .send({ ...GOAL, ...overrides })
    .expect(201);
  return res.body.goal as { id: string };
}

async function join(student: Student, poster: Student, goalId: string) {
  const asked = await request(server)
    .post(`/api/goals/${goalId}/requests`)
    .set(student.auth)
    .send({})
    .expect(201);
  await request(server)
    .post(`/api/requests/${asked.body.request.id}/accept`)
    .set(poster.auth)
    .expect(200);
  return asked.body.request.id as string;
}

const send = (student: Student, goalId: string, body: string) =>
  request(server).post(`/api/goals/${goalId}/messages`).set(student.auth).send({ body });

const history = (student: Student, goalId: string, query = '') =>
  request(server).get(`/api/goals/${goalId}/messages${query}`).set(student.auth);

describe('who can read and write a lobby chat', () => {
  it('lets the poster and an accepted member talk to each other', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu', 'Poster');
    const member = await registerVerifiedUser('member_be24@thapar.edu', 'Member');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);

    await send(poster, goal.id, 'Library, second floor?').expect(201);
    const res = await send(member, goal.id, 'Works for me.').expect(201);
    expect(res.body.message.sender.name).toBe('Member');

    const seen = await history(member, goal.id).expect(200);
    // Newest first: a chat is read from the bottom, so that is the page the API hands back.
    expect(seen.body.messages.map((m: { body: string }) => m.body)).toEqual([
      'Works for me.',
      'Library, second floor?',
    ]);
  });

  it('hides the chat from a student whose request is still pending', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const waiting = await registerVerifiedUser('waiting_be24@thapar.edu');
    const goal = await postGoal(poster);
    await send(poster, goal.id, 'Anyone coming?').expect(201);
    await request(server)
      .post(`/api/goals/${goal.id}/requests`)
      .set(waiting.auth)
      .send({})
      .expect(201);

    await history(waiting, goal.id).expect(404);
    await send(waiting, goal.id, 'let me in').expect(404);
  });

  it('hides the chat from a stranger holding the link, as a 404 rather than a 403', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const stranger = await registerVerifiedUser('stranger_be24@thapar.edu');
    const goal = await postGoal(poster);
    await send(poster, goal.id, 'Private planning').expect(201);

    const res = await history(stranger, goal.id).expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    // And nothing of the conversation leaks through the refusal itself.
    expect(JSON.stringify(res.body)).not.toContain('Private planning');
  });

  it('closes the chat to someone the moment they leave the group', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    const requestId = await join(member, poster, goal.id);
    await history(member, goal.id).expect(200);

    await request(server).post(`/api/requests/${requestId}/withdraw`).set(member.auth).expect(200);

    // Membership is asked fresh on every call, not cached on the session, so this takes effect
    // immediately rather than whenever their token happens to expire.
    await history(member, goal.id).expect(404);
    await send(member, goal.id, 'still here?').expect(404);
  });

  it('never carries an email address', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);
    await send(member, goal.id, 'On my way').expect(201);

    const res = await history(poster, goal.id).expect(200);
    expect(JSON.stringify(res.body)).not.toContain('@thapar.edu');
  });

  it('refuses to let the client choose who a message is from', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu', 'Member');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);

    // `.strict()` on the schema: a body carrying a sender is rejected outright, not ignored.
    await request(server)
      .post(`/api/goals/${goal.id}/messages`)
      .set(member.auth)
      .send({ body: 'I am the poster', senderId: poster.id })
      .expect(400);

    const res = await history(poster, goal.id).expect(200);
    expect(res.body.messages).toEqual([]);
  });
});

describe('writing rules', () => {
  it('rejects an empty message, and one that is only spaces', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const goal = await postGoal(poster);

    await send(poster, goal.id, '').expect(400);
    await send(poster, goal.id, '     ').expect(400);
  });

  it('rejects a message past the length limit', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const goal = await postGoal(poster);

    await send(poster, goal.id, 'x'.repeat(1001)).expect(400);
    await send(poster, goal.id, 'x'.repeat(1000)).expect(201);
  });

  it('trims what it stores, so a message cannot be padded into the layout', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const goal = await postGoal(poster);

    const res = await send(poster, goal.id, '   Library at six   ').expect(201);
    expect(res.body.message.body).toBe('Library at six');
  });

  it('keeps the chat open after a goal is marked done', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);
    await request(server).post(`/api/goals/${goal.id}/close`).set(poster.auth).expect(200);
    await request(server).post(`/api/goals/${goal.id}/complete`).set(poster.auth).expect(200);

    // People still have things to say afterwards — thanks, or who is bringing the notes back.
    await send(member, goal.id, 'That was useful, thanks').expect(201);
  });

  it('closes the chat for writing once a goal is called off', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);
    await request(server).delete(`/api/goals/${goal.id}`).set(poster.auth).expect(200);

    const res = await send(member, goal.id, 'what happened?').expect(409);
    expect(res.body.error.code).toBe('NOT_OPEN');

    // Reading still works: the history is theirs, and it is how they find out why it ended.
    await history(member, goal.id).expect(200);
  });
});

describe('history paging', () => {
  it('pages backwards from the newest message', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const goal = await postGoal(poster);
    for (let i = 1; i <= 5; i += 1) {
      await send(poster, goal.id, `message ${i}`).expect(201);
    }

    const first = await history(poster, goal.id, '?limit=2').expect(200);
    expect(first.body.messages.map((m: { body: string }) => m.body)).toEqual([
      'message 5',
      'message 4',
    ]);
    expect(first.body.nextBefore).not.toBeNull();

    const second = await history(poster, goal.id, `?limit=2&before=${first.body.nextBefore}`);
    expect(second.body.messages.map((m: { body: string }) => m.body)).toEqual([
      'message 3',
      'message 2',
    ]);
  });

  it('reports no older page once the history runs out', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const goal = await postGoal(poster);
    await send(poster, goal.id, 'only one').expect(201);

    const res = await history(poster, goal.id).expect(200);
    expect(res.body.nextBefore).toBeNull();
  });

  it('does not leak another lobby’s messages into this one', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const goalA = await postGoal(poster, { title: 'Goal A' });
    const goalB = await postGoal(poster, { title: 'Goal B' });
    await send(poster, goalA.id, 'belongs to A').expect(201);
    await send(poster, goalB.id, 'belongs to B').expect(201);

    const res = await history(poster, goalA.id).expect(200);
    expect(res.body.messages.map((m: { body: string }) => m.body)).toEqual(['belongs to A']);
  });

  it('deletes a goal’s messages with the goal', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const goal = await postGoal(poster);
    await send(poster, goal.id, 'about to vanish').expect(201);

    await prisma.goal.delete({ where: { id: goal.id } });
    expect(await prisma.message.count({ where: { goalId: goal.id } })).toBe(0);
  });
});
