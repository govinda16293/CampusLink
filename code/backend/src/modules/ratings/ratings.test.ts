import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../db/prisma.js';
import { resetDatabase, setKnownOtp } from '../../test/helpers.js';

/**
 * Step 9 — ratings, and the reliability score they feed.
 *
 * The arithmetic is unit-tested in domain/reliability.test.ts. What is tested here is everything
 * the database and the HTTP layer add: that only the people who were actually there can answer,
 * that nobody can answer twice or about themselves, and — the one that matters most — that the
 * score on a profile really does follow from the votes rather than from whoever shouted last.
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

async function postGoal(poster: Student, headcount = 3) {
  const res = await request(server)
    .post('/api/goals')
    .set(poster.auth)
    .send({
      category: 'STUDY',
      title: 'DBMS revision before the quiz',
      description: 'Transactions and normalisation in the library on Saturday.',
      headcount,
    })
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

async function finish(poster: Student, goalId: string) {
  await request(server).post(`/api/goals/${goalId}/close`).set(poster.auth).expect(200);
  await request(server).post(`/api/goals/${goalId}/complete`).set(poster.auth).expect(200);
}

const rate = (rater: Student, goalId: string, ratings: unknown) =>
  request(server).post(`/api/goals/${goalId}/ratings`).set(rater.auth).send({ ratings });

const summary = (viewer: Student, goalId: string) =>
  request(server).get(`/api/goals/${goalId}/ratings`).set(viewer.auth);

const scoreOf = async (student: Student) =>
  (await prisma.user.findUniqueOrThrow({ where: { id: student.id } })).reliabilityScore;

describe('who may answer', () => {
  it('lets a member answer about another member once the goal is done', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu', 'Poster');
    const member = await registerVerifiedUser('member_be24@thapar.edu', 'Member');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);
    await finish(poster, goal.id);

    const res = await rate(poster, goal.id, [{ subjectId: member.id, attended: true }]).expect(201);
    expect(res.body.people).toHaveLength(1);
    expect(res.body.people[0].attended).toBe(true);
  });

  it('refuses a stranger, as a 404 rather than a 403', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const stranger = await registerVerifiedUser('stranger_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);
    await finish(poster, goal.id);

    await summary(stranger, goal.id).expect(404);
    await rate(stranger, goal.id, [{ subjectId: member.id, attended: false }]).expect(404);
  });

  it('refuses to answer about somebody who was not in the goal', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const outsider = await registerVerifiedUser('outsider_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);
    await finish(poster, goal.id);

    await rate(poster, goal.id, [{ subjectId: outsider.id, attended: false }]).expect(400);
  });

  it('refuses to let anybody answer about themselves', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);
    await finish(poster, goal.id);

    await rate(poster, goal.id, [{ subjectId: poster.id, attended: true }]).expect(400);
  });

  it('refuses before the goal is marked done', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);

    const res = await rate(poster, goal.id, [{ subjectId: member.id, attended: true }]).expect(409);
    expect(res.body.error.code).toBe('NOT_COMPLETED');

    const pending = await summary(poster, goal.id).expect(200);
    expect(pending.body.canRate).toBe(false);
  });

  it('refuses a second answer about the same person', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);
    await finish(poster, goal.id);

    await rate(poster, goal.id, [{ subjectId: member.id, attended: false }]).expect(201);
    // Never editable: otherwise an answer could be changed in retaliation for the one you got.
    await rate(poster, goal.id, [{ subjectId: member.id, attended: true }]).expect(409);
    expect(await scoreOf(member)).toBe(80);
  });

  it('refuses a submission naming the same person twice', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);
    await finish(poster, goal.id);

    await rate(poster, goal.id, [
      { subjectId: member.id, attended: true },
      { subjectId: member.id, attended: false },
    ]).expect(400);
  });

  it('refuses a body that tries to name its own rater', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);
    await finish(poster, goal.id);

    await request(server)
      .post(`/api/goals/${goal.id}/ratings`)
      .set(member.auth)
      .send({ ratings: [{ subjectId: poster.id, attended: false, raterId: poster.id }] })
      .expect(400);
  });
});

describe('the score that comes out', () => {
  it('starts every student at 100', async () => {
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    expect(await scoreOf(student)).toBe(100);
  });

  it('leaves a completed goal at 100 when nobody answers', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);
    await finish(poster, goal.id);

    // Silence is not an accusation. Most goals will never be rated at all.
    expect(await scoreOf(member)).toBe(100);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: member.id } });
    expect(after.goalsCompleted).toBe(1);
    expect(after.noShowCount).toBe(0);
  });

  it('drops a student who is marked absent, and records the no-show', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);
    await finish(poster, goal.id);

    await rate(poster, goal.id, [{ subjectId: member.id, attended: false }]).expect(201);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: member.id } });
    expect(after.noShowCount).toBe(1);
    expect(after.goalsCompleted).toBe(0);
    expect(after.reliabilityScore).toBe(80);
  });

  it('does not let one person outvote two, which is the whole point of a majority', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const accused = await registerVerifiedUser('accused_be24@thapar.edu');
    const witnessA = await registerVerifiedUser('a_be24@thapar.edu');
    const witnessB = await registerVerifiedUser('b_be24@thapar.edu');
    const goal = await postGoal(poster, 3);
    await join(accused, poster, goal.id);
    await join(witnessA, poster, goal.id);
    await join(witnessB, poster, goal.id);
    await finish(poster, goal.id);

    await rate(poster, goal.id, [{ subjectId: accused.id, attended: false }]).expect(201);
    expect(await scoreOf(accused)).toBe(80);

    // Two more say they were there. The earlier accusation is now a minority and the score
    // must recover — which only works because reliability is recomputed, never decremented.
    await rate(witnessA, goal.id, [{ subjectId: accused.id, attended: true }]).expect(201);
    await rate(witnessB, goal.id, [{ subjectId: accused.id, attended: true }]).expect(201);

    expect(await scoreOf(accused)).toBe(100);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: accused.id } });
    expect(after.noShowCount).toBe(0);
    expect(after.goalsCompleted).toBe(1);
  });

  it('treats a tie as present', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const accused = await registerVerifiedUser('accused_be24@thapar.edu');
    const witness = await registerVerifiedUser('witness_be24@thapar.edu');
    const goal = await postGoal(poster, 2);
    await join(accused, poster, goal.id);
    await join(witness, poster, goal.id);
    await finish(poster, goal.id);

    await rate(poster, goal.id, [{ subjectId: accused.id, attended: false }]).expect(201);
    await rate(witness, goal.id, [{ subjectId: accused.id, attended: true }]).expect(201);

    // Half the group saying you were there is not evidence that you were not.
    expect(await scoreOf(accused)).toBe(100);
  });

  it('counts absences across goals, not just within one', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');

    for (let i = 0; i < 3; i += 1) {
      const goal = await postGoal(poster);
      await join(member, poster, goal.id);
      await finish(poster, goal.id);
      await rate(poster, goal.id, [{ subjectId: member.id, attended: false }]).expect(201);
    }

    const after = await prisma.user.findUniqueOrThrow({ where: { id: member.id } });
    expect(after.noShowCount).toBe(3);
    expect(after.goalsCompleted).toBe(0);
    // Three misses and nothing else: 100 * 4/7.
    expect(after.reliabilityScore).toBe(57);
  });

  it('lets a student recover by turning up afterwards', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');

    const missed = await postGoal(poster);
    await join(member, poster, missed.id);
    await finish(poster, missed.id);
    await rate(poster, missed.id, [{ subjectId: member.id, attended: false }]).expect(201);
    const afterMiss = await scoreOf(member);

    for (let i = 0; i < 4; i += 1) {
      const goal = await postGoal(poster);
      await join(member, poster, goal.id);
      await finish(poster, goal.id);
      await rate(poster, goal.id, [{ subjectId: member.id, attended: true }]).expect(201);
    }

    expect(await scoreOf(member)).toBeGreaterThan(afterMiss);
  });

  it('rates the poster too — they can be the one who does not turn up', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);
    await finish(poster, goal.id);

    await rate(member, goal.id, [{ subjectId: poster.id, attended: false }]).expect(201);
    expect(await scoreOf(poster)).toBe(80);
  });

  it('shows the new score on the profile the rest of the app reads', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);
    await finish(poster, goal.id);
    await rate(poster, goal.id, [{ subjectId: member.id, attended: false }]).expect(201);

    const profile = await request(server)
      .get(`/api/users/${member.id}`)
      .set(poster.auth)
      .expect(200);
    expect(profile.body.user.reliabilityScore).toBe(80);
  });
});

describe('the summary a student is shown', () => {
  it('lists everyone else in the lobby, and what has been answered so far', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu', 'Poster');
    const one = await registerVerifiedUser('one_be24@thapar.edu', 'One');
    const two = await registerVerifiedUser('two_be24@thapar.edu', 'Two');
    const goal = await postGoal(poster);
    await join(one, poster, goal.id);
    await join(two, poster, goal.id);
    await finish(poster, goal.id);

    const before = await summary(poster, goal.id).expect(200);
    expect(before.body.canRate).toBe(true);
    // Never themselves: there is nothing for a student to answer about their own attendance.
    expect(before.body.people.map((p: { name: string }) => p.name).sort()).toEqual(['One', 'Two']);
    expect(before.body.people.every((p: { attended: null }) => p.attended === null)).toBe(true);

    await rate(poster, goal.id, [{ subjectId: one.id, attended: true }]).expect(201);

    const after = await summary(poster, goal.id).expect(200);
    const answered = after.body.people.find((p: { name: string }) => p.name === 'One');
    const unanswered = after.body.people.find((p: { name: string }) => p.name === 'Two');
    expect(answered.attended).toBe(true);
    expect(unanswered.attended).toBeNull();
  });

  it('never carries an email address', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);
    await finish(poster, goal.id);

    const res = await summary(poster, goal.id).expect(200);
    expect(JSON.stringify(res.body)).not.toContain('@thapar.edu');
  });

  it('does not count a goal somebody left before it finished', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const quitter = await registerVerifiedUser('quitter_be24@thapar.edu');
    const goal = await postGoal(poster);
    const requestId = await join(quitter, poster, goal.id);
    await request(server).post(`/api/requests/${requestId}/withdraw`).set(quitter.auth).expect(200);
    await finish(poster, goal.id);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: quitter.id } });
    expect(after.goalsCompleted).toBe(0);
    expect(after.reliabilityScore).toBe(100);
    await summary(quitter, goal.id).expect(404);
  });
});
