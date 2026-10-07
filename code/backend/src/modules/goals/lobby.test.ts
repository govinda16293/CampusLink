import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../db/prisma.js';
import { resetDatabase, setKnownOtp } from '../../test/helpers.js';
import { moveGoal } from './goals.service.js';

/**
 * Step 5 — the lobby, end to end.
 *
 * Two things are worth testing here above all else, and they are the two this file leads with:
 * that the roster is closed to everyone outside the group, and that the lifecycle cannot be
 * driven anywhere the state machine forbids. The rest follows from those.
 */

const app = createApp();

beforeEach(resetDatabase);

type Student = { id: string; auth: { Authorization: string } };

async function registerVerifiedUser(email: string, name = 'Test Student'): Promise<Student> {
  await request(app)
    .post('/api/auth/signup')
    .send({ name, email, password: 'correct-horse-1' })
    .expect(201);
  await setKnownOtp(email, '123456');
  const res = await request(app).post('/api/auth/verify-otp').send({ email, code: '123456' });
  return { id: res.body.user.id, auth: { Authorization: `Bearer ${res.body.token}` } };
}

const GOAL = {
  category: 'STUDY',
  title: 'DBMS revision before the quiz',
  description: 'Going through transactions and normalisation in the library on Saturday.',
  headcount: 2,
};

async function postGoal(poster: Student, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/goals')
    .set(poster.auth)
    .send({ ...GOAL, ...overrides })
    .expect(201);
  return res.body.goal as { id: string };
}

/** Puts a student in the group the way the product does: they ask, the poster accepts. */
async function join(student: Student, poster: Student, goalId: string) {
  const asked = await request(app)
    .post(`/api/goals/${goalId}/requests`)
    .set(student.auth)
    .send({})
    .expect(201);
  await request(app)
    .post(`/api/requests/${asked.body.request.id}/accept`)
    .set(poster.auth)
    .expect(200);
  return asked.body.request.id as string;
}

const lobby = (student: Student, goalId: string) =>
  request(app).get(`/api/goals/${goalId}/lobby`).set(student.auth);

const move = (student: Student, goalId: string, action: string) =>
  request(app).post(`/api/goals/${goalId}/${action}`).set(student.auth);

describe('GET /api/goals/:id/lobby — who may see the roster', () => {
  it('shows the poster their own lobby, with everyone who was accepted', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu', 'Poster');
    const member = await registerVerifiedUser('member_be24@thapar.edu', 'Member');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);

    const res = await lobby(poster, goal.id).expect(200);
    expect(res.body.lobby.status).toBe('FORMING');
    expect(res.body.lobby.poster.name).toBe('Poster');
    expect(res.body.lobby.members.map((m: { name: string }) => m.name)).toEqual(['Member']);
  });

  it('shows an accepted member the roster', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu', 'Poster');
    const member = await registerVerifiedUser('member_be24@thapar.edu', 'Member');
    const other = await registerVerifiedUser('other_be24@thapar.edu', 'Other');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);
    await join(other, poster, goal.id);

    const res = await lobby(member, goal.id).expect(200);
    expect(res.body.lobby.members.map((m: { name: string }) => m.name)).toEqual([
      'Member',
      'Other',
    ]);
  });

  it('hides the lobby from a student whose request is still pending', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const waiting = await registerVerifiedUser('waiting_be24@thapar.edu');
    const goal = await postGoal(poster);
    await request(app)
      .post(`/api/goals/${goal.id}/requests`)
      .set(waiting.auth)
      .send({})
      .expect(201);

    await lobby(waiting, goal.id).expect(404);
  });

  it('hides the lobby from a stranger holding the link, as a 404 rather than a 403', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const stranger = await registerVerifiedUser('stranger_be24@thapar.edu');
    const goal = await postGoal(poster);

    // A 403 would confirm the goal exists and has a group, which is one bit more than a stranger
    // is owed. The answer has to be indistinguishable from a goal id that was never real.
    const res = await lobby(stranger, goal.id).expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('closes the lobby again to someone who leaves', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    const requestId = await join(member, poster, goal.id);
    await lobby(member, goal.id).expect(200);

    await request(app).post(`/api/requests/${requestId}/withdraw`).set(member.auth).expect(200);
    await lobby(member, goal.id).expect(404);
  });

  it('never carries an email address, even inside the group', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);

    const res = await lobby(member, goal.id).expect(200);
    expect(JSON.stringify(res.body)).not.toContain('@thapar.edu');
  });

  it('shows an accepted member the poster of an anonymous goal', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu', 'Hidden Poster');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster, { anonymous: true });
    await join(member, poster, goal.id);

    // Acceptance is what lifts anonymity, and by the time this endpoint answers at all, it has
    // already happened — so the name is shown rather than withheld a second time.
    const res = await lobby(member, goal.id).expect(200);
    expect(res.body.lobby.poster.name).toBe('Hidden Poster');
  });
});

describe('the goal lifecycle — confirm, complete, reopen', () => {
  it('confirms a goal, which stops it taking requests', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const latecomer = await registerVerifiedUser('late_be24@thapar.edu');
    const goal = await postGoal(poster, { headcount: 3 });
    await join(member, poster, goal.id);

    const res = await move(poster, goal.id, 'close').expect(200);
    expect(res.body.goal.status).toBe('CLOSED');
    expect(res.body.goal.lobbyStatus).toBe('CONFIRMED');

    const refused = await request(app)
      .post(`/api/goals/${goal.id}/requests`)
      .set(latecomer.auth)
      .send({})
      .expect(409);
    expect(refused.body.error.code).toBe('NOT_OPEN');
  });

  it('answers everyone still waiting when the group is confirmed', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const waiting = await registerVerifiedUser('waiting_be24@thapar.edu');
    const goal = await postGoal(poster, { headcount: 3 });
    const asked = await request(app)
      .post(`/api/goals/${goal.id}/requests`)
      .set(waiting.auth)
      .send({})
      .expect(201);

    await move(poster, goal.id, 'close').expect(200);

    // Left PENDING, this student would wait forever on a goal that had already gone ahead.
    const after = await prisma.joinRequest.findUniqueOrThrow({
      where: { id: asked.body.request.id },
    });
    expect(after.status).toBe('REJECTED');
    expect(after.decidedAt).not.toBeNull();
  });

  it('marks a confirmed goal done and counts it for everyone who was in', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);
    await move(poster, goal.id, 'close').expect(200);

    const res = await move(poster, goal.id, 'complete').expect(200);
    expect(res.body.goal.status).toBe('COMPLETED');
    expect(res.body.goal.lobbyStatus).toBe('COMPLETED');

    for (const id of [poster.id, member.id]) {
      const user = await prisma.user.findUniqueOrThrow({ where: { id } });
      expect(user.goalsCompleted).toBe(1);
    }
  });

  it('does not count a completion for someone who left before it happened', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const quitter = await registerVerifiedUser('quitter_be24@thapar.edu');
    const goal = await postGoal(poster);
    const requestId = await join(quitter, poster, goal.id);
    await request(app).post(`/api/requests/${requestId}/withdraw`).set(quitter.auth).expect(200);

    await move(poster, goal.id, 'close').expect(200);
    await move(poster, goal.id, 'complete').expect(200);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: quitter.id } });
    expect(user.goalsCompleted).toBe(0);
  });

  it('refuses to complete a goal that was never confirmed', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const goal = await postGoal(poster);

    const res = await move(poster, goal.id, 'complete').expect(409);
    expect(res.body.error.code).toBe('CONFLICT');

    const user = await prisma.user.findUniqueOrThrow({ where: { id: poster.id } });
    expect(user.goalsCompleted).toBe(0);
  });

  it('refuses to complete the same goal twice, so nobody is counted twice', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const goal = await postGoal(poster);
    await move(poster, goal.id, 'close').expect(200);
    await move(poster, goal.id, 'complete').expect(200);

    await move(poster, goal.id, 'complete').expect(409);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: poster.id } });
    expect(user.goalsCompleted).toBe(1);
  });

  it('refuses to let a member leave a goal that has already happened', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    const requestId = await join(member, poster, goal.id);
    await move(poster, goal.id, 'close').expect(200);
    await move(poster, goal.id, 'complete').expect(200);

    const res = await request(app)
      .post(`/api/requests/${requestId}/withdraw`)
      .set(member.auth)
      .expect(409);
    expect(res.body.error.code).toBe('NOT_OPEN');

    // The record of who turned up must survive: the count was already banked for everyone.
    const after = await prisma.goal.findUniqueOrThrow({ where: { id: goal.id } });
    expect(after.acceptedCount).toBe(1);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: member.id } });
    expect(user.goalsCompleted).toBe(1);
  });

  it('still lets a member leave a confirmed goal that has not happened yet', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    const requestId = await join(member, poster, goal.id);
    await move(poster, goal.id, 'close').expect(200);

    // Plans change between confirming and the day itself, and the poster needs to know.
    await request(app).post(`/api/requests/${requestId}/withdraw`).set(member.auth).expect(200);
    const after = await prisma.goal.findUniqueOrThrow({ where: { id: goal.id } });
    expect(after.acceptedCount).toBe(0);
  });

  it('reopens a confirmed goal, and lands it on FULL when every spot is still taken', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster, { headcount: 1 });
    await join(member, poster, goal.id);
    await move(poster, goal.id, 'close').expect(200);

    // The state machine says CLOSED --reopen--> OPEN; only the service knows the seats are gone.
    const res = await move(poster, goal.id, 'reopen').expect(200);
    expect(res.body.goal.status).toBe('FULL');
  });

  it('reopens to OPEN when a spot came free while it was closed', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster, { headcount: 1 });
    const requestId = await join(member, poster, goal.id);
    await move(poster, goal.id, 'close').expect(200);
    await request(app).post(`/api/requests/${requestId}/withdraw`).set(member.auth).expect(200);

    const res = await move(poster, goal.id, 'reopen').expect(200);
    expect(res.body.goal.status).toBe('OPEN');
  });

  it('refuses every lifecycle change from anyone but the poster', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);

    for (const action of ['close', 'complete', 'reopen']) {
      await move(member, goal.id, action).expect(403);
    }
    await request(app).delete(`/api/goals/${goal.id}`).set(member.auth).expect(403);
  });

  it('still lets a confirmed goal be called off', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const goal = await postGoal(poster);
    await move(poster, goal.id, 'close').expect(200);

    await request(app).delete(`/api/goals/${goal.id}`).set(poster.auth).expect(200);
    const after = await prisma.goal.findUniqueOrThrow({ where: { id: goal.id } });
    expect(after.status).toBe('CANCELLED');
  });
});

describe('two posters acting at the same instant', () => {
  /*
   * These call `moveGoal` directly, and that is the point.
   *
   * Everything above drives real HTTP, but no pair of HTTP requests can reach the compare-and-set:
   * `transitionGoal` rejects an illegal move before writing, so the second "mark as done" never
   * gets that far, and two simultaneous requests against SQLite run one after the other regardless.
   * Both guards below were verified by deleting them and watching these fail — without that, a
   * green test here would mean nothing at all.
   */

  async function closedGoal() {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const goal = await postGoal(poster);
    await move(poster, goal.id, 'close').expect(200);
    return goal;
  }

  it('lets only the first of two completions land', async () => {
    const goal = await closedGoal();

    await moveGoal(goal.id, 'CLOSED', 'COMPLETED');
    // The second caller read CLOSED before the first wrote, and still believes it.
    await expect(moveGoal(goal.id, 'CLOSED', 'COMPLETED')).rejects.toThrow(/changed a moment ago/);
  });

  it('refuses a move built on a status that is no longer true', async () => {
    const goal = await closedGoal();

    // A poster cancels while another tab, holding a stale read, tries to confirm.
    await moveGoal(goal.id, 'CLOSED', 'CANCELLED');
    await expect(moveGoal(goal.id, 'CLOSED', 'COMPLETED')).rejects.toThrow();

    const after = await prisma.goal.findUniqueOrThrow({ where: { id: goal.id } });
    expect(after.status).toBe('CANCELLED');
  });
});

describe('GET /api/goals?joined=true — the goals you are in', () => {
  it('lists goals you were accepted onto, and not ones you only asked about', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const joinedGoal = await postGoal(poster, { title: 'The one I am in' });
    const askedGoal = await postGoal(poster, { title: 'The one I only asked about' });
    await join(member, poster, joinedGoal.id);
    await request(app)
      .post(`/api/goals/${askedGoal.id}/requests`)
      .set(member.auth)
      .send({})
      .expect(201);

    const res = await request(app).get('/api/goals?joined=true').set(member.auth).expect(200);
    expect(res.body.goals.map((g: { title: string }) => g.title)).toEqual(['The one I am in']);
  });

  it('does not list your own goals among the ones you joined', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    await postGoal(poster);

    const res = await request(app).get('/api/goals?joined=true').set(poster.auth).expect(200);
    expect(res.body.goals).toEqual([]);
  });

  it('keeps a joined goal after its time has passed, unlike the public feed', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);

    // Walking the clock past the goal rather than waiting for it: the feed filters on expiresAt,
    // so moving that into the past is exactly what time passing looks like to the query.
    await prisma.goal.update({
      where: { id: goal.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const feed = await request(app).get('/api/goals').set(member.auth).expect(200);
    expect(feed.body.goals).toEqual([]);

    const joinedList = await request(app)
      .get('/api/goals?joined=true')
      .set(member.auth)
      .expect(200);
    expect(joinedList.body.goals).toHaveLength(1);
  });

  it('drops a goal you left', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    const requestId = await join(member, poster, goal.id);

    await request(app).post(`/api/requests/${requestId}/withdraw`).set(member.auth).expect(200);
    const res = await request(app).get('/api/goals?joined=true').set(member.auth).expect(200);
    expect(res.body.goals).toEqual([]);
  });
});

describe('pendingRequestCount — the badge on a poster’s own card', () => {
  it('counts the people waiting, for the poster only', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const one = await registerVerifiedUser('one_be24@thapar.edu');
    const two = await registerVerifiedUser('two_be24@thapar.edu');
    const goal = await postGoal(poster, { headcount: 3 });
    await request(app).post(`/api/goals/${goal.id}/requests`).set(one.auth).send({}).expect(201);
    await request(app).post(`/api/goals/${goal.id}/requests`).set(two.auth).send({}).expect(201);

    const mine = await request(app).get('/api/goals?mine=true').set(poster.auth).expect(200);
    expect(mine.body.goals[0].pendingRequestCount).toBe(2);

    // Nobody else learns how many people want in — the query is scoped to goals you posted, so
    // there is no number here to withhold in the first place.
    const theirs = await request(app).get('/api/goals').set(one.auth).expect(200);
    expect(theirs.body.goals[0].pendingRequestCount).toBeNull();
  });

  it('drops back to zero once every request is decided', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);

    const res = await request(app).get(`/api/goals/${goal.id}`).set(poster.auth).expect(200);
    expect(res.body.goal.pendingRequestCount).toBe(0);
    expect(res.body.goal.viewerIsMember).toBe(true);
  });
});
