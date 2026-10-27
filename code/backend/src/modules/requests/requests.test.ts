import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../db/prisma.js';
import { resetDatabase, setKnownOtp } from '../../test/helpers.js';
import { moveRequest, takeSeatIfUnchanged } from './requests.service.js';

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

async function registerVerifiedUser(
  email: string,
  name = 'Test Student',
  gender?: string,
): Promise<Student> {
  await request(server)
    .post('/api/auth/signup')
    .send({ name, email, password: 'correct-horse-1' })
    .expect(201);
  await setKnownOtp(email, '123456');
  const res = await request(server).post('/api/auth/verify-otp').send({ email, code: '123456' });
  if (gender) await prisma.user.update({ where: { email }, data: { gender } });
  return { id: res.body.user.id, auth: { Authorization: `Bearer ${res.body.token}` } };
}

const GOAL = {
  category: 'GYM',
  title: 'Gym partner for 6am',
  description: 'Looking for someone to keep me accountable at the gym before class.',
  headcount: 1,
};

async function postGoal(poster: Student, overrides: Record<string, unknown> = {}) {
  const res = await request(server)
    .post('/api/goals')
    .set(poster.auth)
    .send({ ...GOAL, ...overrides })
    .expect(201);
  return res.body.goal as { id: string };
}

const ask = (student: Student, goalId: string, body: Record<string, unknown> = {}) =>
  request(server).post(`/api/goals/${goalId}/requests`).set(student.auth).send(body);

const act = (student: Student, requestId: string, action: 'accept' | 'reject' | 'withdraw') =>
  request(server).post(`/api/requests/${requestId}/${action}`).set(student.auth);

describe('POST /api/goals/:id/requests — asking to join', () => {
  it('creates a pending request and reflects it on the goal', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu', 'Poster');
    const student = await registerVerifiedUser('student_be24@thapar.edu', 'Student');
    const goal = await postGoal(poster, { headcount: 2 });

    const res = await ask(student, goal.id, { message: 'I train at 6 most days.' }).expect(201);
    expect(res.body.request.status).toBe('PENDING');
    expect(res.body.request.message).toBe('I train at 6 most days.');
    expect(res.body.goal.viewerRequest).toEqual({ id: res.body.request.id, status: 'PENDING' });
    expect(res.body.goal.viewerCanRequest).toBe(false);
    expect(res.body.goal.acceptedCount).toBe(0);

    const detail = await request(server).get(`/api/goals/${goal.id}`).set(student.auth).expect(200);
    expect(detail.body.goal.viewerRequest.status).toBe('PENDING');
  });

  it('refuses a request on your own goal', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const goal = await postGoal(poster);
    const res = await ask(poster, goal.id).expect(403);
    expect(res.body.error.code).toBe('OWN_GOAL');
  });

  it('refuses a second request while the first is still pending', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const goal = await postGoal(poster);

    await ask(student, goal.id).expect(201);
    const res = await ask(student, goal.id).expect(409);
    expect(res.body.error.code).toBe('ALREADY_PENDING');
  });

  it('enforces the gender preference', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const goal = await postGoal(poster, { genderPreference: 'FEMALE_ONLY', headcount: 3 });
    const undisclosed = await registerVerifiedUser('unsaid_be24@thapar.edu');
    const man = await registerVerifiedUser('ravi_be24@thapar.edu', 'Ravi', 'MALE');
    const woman = await registerVerifiedUser('asha_be24@thapar.edu', 'Asha', 'FEMALE');

    const refused = await ask(undisclosed, goal.id).expect(403);
    expect(refused.body.error.code).toBe('GENDER');
    expect(refused.body.error.message).toContain('profile');
    await ask(man, goal.id).expect(403);
    await ask(woman, goal.id).expect(201);
  });

  it('refuses a request on a goal whose time has passed', async () => {
    // The feed hides these, but a link to one still opens — and it must not be joinable.
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const goal = await postGoal(poster);
    await prisma.goal.update({
      where: { id: goal.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await ask(student, goal.id).expect(409);
    expect(res.body.error.code).toBe('EXPIRED');
  });

  it('refuses a request on a cancelled goal', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const goal = await postGoal(poster);
    await request(server).delete(`/api/goals/${goal.id}`).set(poster.auth).expect(200);

    const res = await ask(student, goal.id).expect(409);
    expect(res.body.error.code).toBe('NOT_OPEN');
  });

  it('accepts at once when the poster turned on auto-accept, until the spots run out', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const late = await registerVerifiedUser('late_be24@thapar.edu');
    const goal = await postGoal(poster, { autoAccept: true, headcount: 1 });

    const res = await ask(student, goal.id).expect(201);
    expect(res.body.request.status).toBe('ACCEPTED');
    expect(res.body.goal.acceptedCount).toBe(1);
    expect(res.body.goal.status).toBe('FULL');

    const tooLate = await ask(late, goal.id).expect(409);
    expect(tooLate.body.error.code).toBe('FULL');
  });

  it('cannot be used to set your own status, and caps the note', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const goal = await postGoal(poster);

    await ask(student, goal.id, { status: 'ACCEPTED' }).expect(400);
    await ask(student, goal.id, { message: 'x'.repeat(201) }).expect(400);
    expect(await prisma.joinRequest.count()).toBe(0);
  });

  it('answers 404 for a goal that does not exist, and 401 without a session', async () => {
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    await ask(student, 'no-such-goal').expect(404);
    await request(server).post('/api/goals/anything/requests').send({}).expect(401);
  });
});

describe("GET /api/goals/:id/requests — the poster's view", () => {
  it('lists who asked, with their public profile and never their email', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu', 'Poster');
    const student = await registerVerifiedUser('student_be24@thapar.edu', 'Student');
    const goal = await postGoal(poster);
    await ask(student, goal.id, { message: 'Keen.' }).expect(201);

    const res = await request(server).get(`/api/goals/${goal.id}/requests`).set(poster.auth);
    expect(res.status).toBe(200);
    expect(res.body.requests).toHaveLength(1);
    expect(res.body.requests[0].requester.name).toBe('Student');
    expect(res.body.requests[0].requester).not.toHaveProperty('email');
    expect(JSON.stringify(res.body)).not.toContain('student_be24@thapar.edu');
  });

  it('is refused to everyone but the poster, including the people who asked', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const outsider = await registerVerifiedUser('outsider_be24@thapar.edu');
    const goal = await postGoal(poster);
    await ask(student, goal.id).expect(201);

    await request(server).get(`/api/goals/${goal.id}/requests`).set(student.auth).expect(403);
    await request(server).get(`/api/goals/${goal.id}/requests`).set(outsider.auth).expect(403);
  });
});

describe('accepting and declining', () => {
  it("fills the goal, takes it off the feed, and keeps it on the poster's own list", async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const outsider = await registerVerifiedUser('outsider_be24@thapar.edu');
    const goal = await postGoal(poster, { headcount: 1 });
    const pending = (await ask(student, goal.id).expect(201)).body.request;

    const res = await act(poster, pending.id, 'accept').expect(200);
    expect(res.body.request.status).toBe('ACCEPTED');
    expect(res.body.goal.status).toBe('FULL');
    expect(res.body.goal.spotsLeft).toBe(0);

    // A full goal is no longer something to discover...
    const feed = await request(server).get('/api/goals').set(outsider.auth).expect(200);
    expect(feed.body.goals.map((g: { id: string }) => g.id)).not.toContain(goal.id);
    // ...but it has not stopped being the poster's to manage.
    const mine = await request(server).get('/api/goals?mine=true').set(poster.auth).expect(200);
    expect(mine.body.goals.map((g: { id: string }) => g.id)).toContain(goal.id);
  });

  it('refuses to accept once every spot is taken, leaving the request pending', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const first = await registerVerifiedUser('first_be24@thapar.edu');
    const second = await registerVerifiedUser('second_be24@thapar.edu');
    const goal = await postGoal(poster, { headcount: 1 });
    const a = (await ask(first, goal.id).expect(201)).body.request;
    const b = (await ask(second, goal.id).expect(201)).body.request;

    await act(poster, a.id, 'accept').expect(200);
    const res = await act(poster, b.id, 'accept').expect(409);
    expect(res.body.error.code).toBe('FULL');

    const stored = await prisma.joinRequest.findUniqueOrThrow({ where: { id: b.id } });
    expect(stored.status).toBe('PENDING');
  });

  it('gives anyone but the poster the same 404 as a request that does not exist', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const outsider = await registerVerifiedUser('outsider_be24@thapar.edu');
    const goal = await postGoal(poster);
    const pending = (await ask(student, goal.id).expect(201)).body.request;

    await act(outsider, pending.id, 'accept').expect(404);
    await act(student, pending.id, 'accept').expect(404);
    await act(poster, 'no-such-request', 'accept').expect(404);
  });

  it('does not let a declined student simply ask again', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const goal = await postGoal(poster);
    const pending = (await ask(student, goal.id).expect(201)).body.request;

    const declined = await act(poster, pending.id, 'reject').expect(200);
    expect(declined.body.request.status).toBe('REJECTED');

    const again = await ask(student, goal.id).expect(409);
    expect(again.body.error.code).toBe('DECLINED');
  });

  it('refuses a move the state machine does not allow', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const goal = await postGoal(poster);
    const pending = (await ask(student, goal.id).expect(201)).body.request;
    await act(poster, pending.id, 'reject').expect(200);

    const res = await act(poster, pending.id, 'accept').expect(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });
});

describe('withdrawing', () => {
  it('lets a student withdraw a pending request and ask again on the same request', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const goal = await postGoal(poster);
    const first = (await ask(student, goal.id).expect(201)).body.request;

    const withdrawn = await act(student, first.id, 'withdraw').expect(200);
    expect(withdrawn.body.request.status).toBe('WITHDRAWN');
    expect(withdrawn.body.goal.viewerCanRequest).toBe(true);

    const again = await ask(student, goal.id, { message: 'Changed my mind.' }).expect(201);
    expect(again.body.request.id).toBe(first.id);
    expect(again.body.request.status).toBe('PENDING');
    expect(again.body.request.message).toBe('Changed my mind.');
  });

  it('gives the spot back when an accepted member leaves, exactly once', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const next = await registerVerifiedUser('next_be24@thapar.edu');
    const goal = await postGoal(poster, { headcount: 1 });
    const pending = (await ask(student, goal.id).expect(201)).body.request;
    await act(poster, pending.id, 'accept').expect(200);

    const left = await act(student, pending.id, 'withdraw').expect(200);
    expect(left.body.goal.status).toBe('OPEN');
    expect(left.body.goal.acceptedCount).toBe(0);

    // A second tap must not hand back a spot that was never taken again.
    await act(student, pending.id, 'withdraw').expect(409);
    const stored = await prisma.goal.findUniqueOrThrow({ where: { id: goal.id } });
    expect(stored.acceptedCount).toBe(0);

    await ask(next, goal.id).expect(201);
  });

  it('can only be done by the student who asked', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const goal = await postGoal(poster);
    const pending = (await ask(student, goal.id).expect(201)).body.request;

    await act(poster, pending.id, 'withdraw').expect(404);
  });
});

describe('anonymity and ownership after acceptance', () => {
  it('reveals an anonymous poster to a requester only once they are accepted', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu', 'Hidden Poster');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const outsider = await registerVerifiedUser('outsider_be24@thapar.edu');
    const goal = await postGoal(poster, { anonymous: true, headcount: 2 });
    const pending = (await ask(student, goal.id).expect(201)).body.request;

    const before = await request(server).get(`/api/goals/${goal.id}`).set(student.auth).expect(200);
    expect(before.body.goal.poster.isAnonymous).toBe(true);
    expect(JSON.stringify(before.body)).not.toContain('Hidden Poster');

    await act(poster, pending.id, 'accept').expect(200);

    const after = await request(server).get(`/api/goals/${goal.id}`).set(student.auth).expect(200);
    expect(after.body.goal.poster.isAnonymous).toBe(false);
    expect(after.body.goal.poster.name).toBe('Hidden Poster');

    // Still hidden from anyone who was never accepted.
    const other = await request(server).get(`/api/goals/${goal.id}`).set(outsider.auth).expect(200);
    expect(other.body.goal.poster.isAnonymous).toBe(true);
    expect(JSON.stringify(other.body)).not.toContain('Hidden Poster');
  });

  it('lets the poster cancel a goal that has filled', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const goal = await postGoal(poster, { headcount: 1 });
    const pending = (await ask(student, goal.id).expect(201)).body.request;
    await act(poster, pending.id, 'accept').expect(200);

    const res = await request(server).delete(`/api/goals/${goal.id}`).set(poster.auth).expect(200);
    expect(res.body.goal.status).toBe('CANCELLED');
  });
});

describe('the compare-and-set guards against stale reads', () => {
  // Two real HTTP requests fired together against SQLite execute one after the other, so they
  // cannot produce the interleaving these guards exist for: an earlier test built that way kept
  // passing with the guard deleted. These reproduce the stale read directly instead.

  it('refuses a spot claimed on a count that has since changed', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const goal = await postGoal(poster, { headcount: 2 });
    // Both accepts read the goal before either of them writes.
    const seen = await prisma.goal.findUniqueOrThrow({ where: { id: goal.id } });

    expect(await takeSeatIfUnchanged(goal.id, seen)).toBe(true);
    expect(await takeSeatIfUnchanged(goal.id, seen)).toBe(false);

    const stored = await prisma.goal.findUniqueOrThrow({ where: { id: goal.id } });
    expect(stored.acceptedCount).toBe(1);
  });

  it('refuses a request move made on a status that has since changed', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const goal = await postGoal(poster);
    const pending = (await ask(student, goal.id).expect(201)).body.request;

    // The poster declines and the student withdraws, both having read PENDING.
    await moveRequest(pending.id, 'PENDING', 'reject');
    await expect(moveRequest(pending.id, 'PENDING', 'withdraw')).rejects.toMatchObject({
      code: 'CONFLICT',
    });

    const stored = await prisma.joinRequest.findUniqueOrThrow({ where: { id: pending.id } });
    expect(stored.status).toBe('REJECTED');
  });
});
