import { afterAll, beforeEach, describe, expect, it } from 'vitest';
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

/** Puts a student in the group the way the product does: they ask, the poster accepts. */
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

const lobby = (student: Student, goalId: string) =>
  request(server).get(`/api/goals/${goalId}/lobby`).set(student.auth);

const move = (student: Student, goalId: string, action: string) =>
  request(server).post(`/api/goals/${goalId}/${action}`).set(student.auth);

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
    await request(server)
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

    await request(server).post(`/api/requests/${requestId}/withdraw`).set(member.auth).expect(200);
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

    const refused = await request(server)
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
    const asked = await request(server)
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
    await request(server).post(`/api/requests/${requestId}/withdraw`).set(quitter.auth).expect(200);

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

    const res = await request(server)
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
    await request(server).post(`/api/requests/${requestId}/withdraw`).set(member.auth).expect(200);
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
    await request(server).post(`/api/requests/${requestId}/withdraw`).set(member.auth).expect(200);

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
    await request(server).delete(`/api/goals/${goal.id}`).set(member.auth).expect(403);
  });

  it('still lets a confirmed goal be called off', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const goal = await postGoal(poster);
    await move(poster, goal.id, 'close').expect(200);

    await request(server).delete(`/api/goals/${goal.id}`).set(poster.auth).expect(200);
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
    await request(server)
      .post(`/api/goals/${askedGoal.id}/requests`)
      .set(member.auth)
      .send({})
      .expect(201);

    const res = await request(server).get('/api/goals?joined=true').set(member.auth).expect(200);
    expect(res.body.goals.map((g: { title: string }) => g.title)).toEqual(['The one I am in']);
  });

  it('does not list your own goals among the ones you joined', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    await postGoal(poster);

    const res = await request(server).get('/api/goals?joined=true').set(poster.auth).expect(200);
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

    const feed = await request(server).get('/api/goals').set(member.auth).expect(200);
    expect(feed.body.goals).toEqual([]);

    const joinedList = await request(server)
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

    await request(server).post(`/api/requests/${requestId}/withdraw`).set(member.auth).expect(200);
    const res = await request(server).get('/api/goals?joined=true').set(member.auth).expect(200);
    expect(res.body.goals).toEqual([]);
  });
});

describe('pendingRequestCount — the badge on a poster’s own card', () => {
  it('counts the people waiting, for the poster only', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const one = await registerVerifiedUser('one_be24@thapar.edu');
    const two = await registerVerifiedUser('two_be24@thapar.edu');
    const goal = await postGoal(poster, { headcount: 3 });
    await request(server).post(`/api/goals/${goal.id}/requests`).set(one.auth).send({}).expect(201);
    await request(server).post(`/api/goals/${goal.id}/requests`).set(two.auth).send({}).expect(201);

    const mine = await request(server).get('/api/goals?mine=true').set(poster.auth).expect(200);
    expect(mine.body.goals[0].pendingRequestCount).toBe(2);

    // Nobody else learns how many people want in — the query is scoped to goals you posted, so
    // there is no number here to withhold in the first place.
    const theirs = await request(server).get('/api/goals').set(one.auth).expect(200);
    expect(theirs.body.goals[0].pendingRequestCount).toBeNull();
  });

  it('drops back to zero once every request is decided', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);

    const res = await request(server).get(`/api/goals/${goal.id}`).set(poster.auth).expect(200);
    expect(res.body.goal.pendingRequestCount).toBe(0);
    expect(res.body.goal.viewerIsMember).toBe(true);
  });
});

describe('PATCH /api/goals/:id — editing a goal that is already posted', () => {
  const edit = (student: Student, goalId: string, body: Record<string, unknown>) =>
    request(server).patch(`/api/goals/${goalId}`).set(student.auth).send(body);

  const soon = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

  it('changes the time, and says so in the group chat', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);

    const res = await edit(poster, goal.id, { dateTime: soon(30) }).expect(200);
    expect(res.body.goal.dateTime).not.toBeNull();

    // The whole reason editing is safe: somebody who joined for six o'clock finds out, in the
    // place they are already looking, rather than by turning up at the wrong time.
    const chat = await request(server)
      .get(`/api/goals/${goal.id}/messages`)
      .set(member.auth)
      .expect(200);
    expect(chat.body.messages[0].kind).toBe('SYSTEM');
    expect(chat.body.messages[0].body).toMatch(/^The time changed to /);
  });

  it('says nothing in the chat when the time did not change', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);

    await edit(poster, goal.id, { title: 'A completely different title' }).expect(200);

    const chat = await request(server)
      .get(`/api/goals/${goal.id}/messages`)
      .set(poster.auth)
      .expect(200);
    expect(chat.body.messages).toEqual([]);
  });

  it('leaves the fields it was not given alone', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const goal = await postGoal(poster, { headcount: 3, description: 'The original plan.' });

    const res = await edit(poster, goal.id, { title: 'Only the title moved' }).expect(200);
    expect(res.body.goal.title).toBe('Only the title moved');
    expect(res.body.goal.description).toBe('The original plan.');
    expect(res.body.goal.headcount).toBe(3);
  });

  it('refuses anybody but the poster', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);

    await edit(member, goal.id, { title: 'Hijacked by a member' }).expect(403);
  });

  it('refuses a time in the past', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const goal = await postGoal(poster);
    await edit(poster, goal.id, { dateTime: '2020-01-01T10:00:00.000Z' }).expect(400);
  });

  it('refuses a headcount below the people already in', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const one = await registerVerifiedUser('one_be24@thapar.edu');
    const two = await registerVerifiedUser('two_be24@thapar.edu');
    const goal = await postGoal(poster, { headcount: 3 });
    await join(one, poster, goal.id);
    await join(two, poster, goal.id);

    // There is no honest way to choose which of them stops being in.
    await edit(poster, goal.id, { headcount: 1 }).expect(400);
    await edit(poster, goal.id, { headcount: 2 }).expect(200);
  });

  it('reopens a full goal when the headcount goes up', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster, { headcount: 1 });
    await join(member, poster, goal.id);

    const before = await request(server).get(`/api/goals/${goal.id}`).set(poster.auth);
    expect(before.body.goal.status).toBe('FULL');

    const res = await edit(poster, goal.id, { headcount: 3 }).expect(200);
    expect(res.body.goal.status).toBe('OPEN');
    expect(res.body.goal.spotsLeft).toBe(2);
  });

  it('fills a goal when the headcount drops onto the people already in', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster, { headcount: 3 });
    await join(member, poster, goal.id);

    const res = await edit(poster, goal.id, { headcount: 1 }).expect(200);
    expect(res.body.goal.status).toBe('FULL');
  });

  it('refuses to hide the poster once people have seen who they are', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);

    const res = await edit(poster, goal.id, { anonymous: true }).expect(400);
    expect(res.body.error.message).toMatch(/already joined/);
  });

  it('allows anonymity to be turned on while nobody is in yet', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const goal = await postGoal(poster);
    await edit(poster, goal.id, { anonymous: true }).expect(200);
  });

  it('always allows a poster to drop their own anonymity', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster, { anonymous: true });
    await join(member, poster, goal.id);

    // Revealing yourself is your own business, whoever has already joined.
    const res = await edit(poster, goal.id, { anonymous: false }).expect(200);
    expect(res.body.goal.anonymous).toBe(false);
  });

  it('refuses to edit a goal that has already finished', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const goal = await postGoal(poster);
    await move(poster, goal.id, 'close').expect(200);
    await move(poster, goal.id, 'complete').expect(200);

    const res = await edit(poster, goal.id, { title: 'Rewriting history' }).expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('refuses a body that tries to set the status directly', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const goal = await postGoal(poster);
    // The lifecycle has its own endpoints, and `.strict()` refuses the shortcut.
    await edit(poster, goal.id, { status: 'COMPLETED' }).expect(400);
    await edit(poster, goal.id, { acceptedCount: 99 }).expect(400);
  });

  it('refuses an empty edit', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const goal = await postGoal(poster);
    await edit(poster, goal.id, {}).expect(400);
  });

  it('moves the expiry with the time, so the feed follows the new one', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const goal = await postGoal(poster, { dateTime: soon(2) });

    await edit(poster, goal.id, { dateTime: soon(50) }).expect(200);
    const stored = await prisma.goal.findUniqueOrThrow({ where: { id: goal.id } });
    expect(stored.expiresAt?.getTime()).toBe(stored.dateTime?.getTime());
  });
});
