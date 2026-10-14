import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { USER_ROLE } from '@campuslink/shared';
import { createApp } from '../../app.js';
import { prisma } from '../../db/prisma.js';
import { resetDatabase, setKnownOtp } from '../../test/helpers.js';

/**
 * Step 8 — report, block, and the audit trail behind unmasking.
 *
 * Three claims the rest of the product makes are only true if this file passes: that blocking
 * works in both directions, that reporting an anonymous poster never tells the reporter who they
 * are, and that an admin cannot see behind anonymity without leaving a permanent record.
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

async function makeAdmin(student: Student) {
  await prisma.user.update({ where: { id: student.id }, data: { role: USER_ROLE.ADMIN } });
}

async function postGoal(poster: Student, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/goals')
    .set(poster.auth)
    .send({
      category: 'STUDY',
      title: 'DBMS revision before the quiz',
      description: 'Transactions and normalisation in the library on Saturday.',
      headcount: 2,
      ...overrides,
    })
    .expect(201);
  return res.body.goal as { id: string };
}

const feed = (student: Student) => request(app).get('/api/goals').set(student.auth);
const blockUser = (student: Student, targetId: string) =>
  request(app).post(`/api/blocks/${targetId}`).set(student.auth);
const fileReport = (student: Student, body: Record<string, unknown>) =>
  request(app).post('/api/reports').set(student.auth).send(body);

describe('blocking', () => {
  it('hides the blocked student’s goals from the blocker’s feed', async () => {
    const annoying = await registerVerifiedUser('annoying_be24@thapar.edu');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    await postGoal(annoying);

    expect((await feed(student).expect(200)).body.goals).toHaveLength(1);
    await blockUser(student, annoying.id).expect(201);
    expect((await feed(student).expect(200)).body.goals).toHaveLength(0);
  });

  it('hides the blocker from the blocked student too, which is the point', async () => {
    const annoying = await registerVerifiedUser('annoying_be24@thapar.edu');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    await postGoal(student);

    await blockUser(student, annoying.id).expect(201);

    // Enforced both ways although stored one way. Read one-way, the blocked student would still
    // see the blocker's goals and could still ask to join them — the opposite of blocking.
    expect((await feed(annoying).expect(200)).body.goals).toHaveLength(0);
  });

  it('stops either of them joining the other’s goal', async () => {
    const annoying = await registerVerifiedUser('annoying_be24@thapar.edu');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const theirGoal = await postGoal(annoying);
    const myGoal = await postGoal(student);
    await blockUser(student, annoying.id).expect(201);

    await request(app)
      .post(`/api/goals/${theirGoal.id}/requests`)
      .set(student.auth)
      .send({})
      .expect(404);
    await request(app)
      .post(`/api/goals/${myGoal.id}/requests`)
      .set(annoying.auth)
      .send({})
      .expect(404);
  });

  it('leaves everybody else’s feed alone', async () => {
    const annoying = await registerVerifiedUser('annoying_be24@thapar.edu');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const bystander = await registerVerifiedUser('bystander_be24@thapar.edu');
    await postGoal(annoying);
    await blockUser(student, annoying.id).expect(201);

    expect((await feed(bystander).expect(200)).body.goals).toHaveLength(1);
  });

  it('is reversible, and blocking twice is not an error', async () => {
    const annoying = await registerVerifiedUser('annoying_be24@thapar.edu');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    await postGoal(annoying);

    await blockUser(student, annoying.id).expect(201);
    // A double tap on the button, not something to show an error for.
    await blockUser(student, annoying.id).expect(201);
    expect(await prisma.block.count()).toBe(1);

    await request(app).delete(`/api/blocks/${annoying.id}`).set(student.auth).expect(200);
    expect((await feed(student).expect(200)).body.goals).toHaveLength(1);
  });

  it('refuses to let anybody block themselves', async () => {
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    await blockUser(student, student.id).expect(400);
  });

  it('lists only the blocks a student made, never the ones against them', async () => {
    const one = await registerVerifiedUser('one_be24@thapar.edu', 'One');
    const two = await registerVerifiedUser('two_be24@thapar.edu', 'Two');
    await blockUser(one, two.id).expect(201);

    const mine = await request(app).get('/api/blocks').set(one.auth).expect(200);
    expect(mine.body.blocks.map((b: { name: string }) => b.name)).toEqual(['Two']);

    // Telling somebody who has blocked them is an invitation to go and ask why.
    const theirs = await request(app).get('/api/blocks').set(two.auth).expect(200);
    expect(theirs.body.blocks).toEqual([]);
  });

  it('does not remove them from a lobby they are already in', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    const asked = await request(app)
      .post(`/api/goals/${goal.id}/requests`)
      .set(member.auth)
      .send({})
      .expect(201);
    await request(app)
      .post(`/api/requests/${asked.body.request.id}/accept`)
      .set(poster.auth)
      .expect(200);

    await blockUser(member, poster.id).expect(201);

    // Deliberate: silently dissolving a group somebody committed to, and a chat other people are
    // relying on, is a bigger act than the student asked for. Leaving stays their own choice.
    await request(app).get(`/api/goals/${goal.id}/lobby`).set(member.auth).expect(200);
  });
});

describe('reporting', () => {
  it('accepts a report about a goal and tells the reporter nothing about the subject', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu', 'Poster Name');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const goal = await postGoal(poster, { anonymous: true });

    const res = await fileReport(student, {
      reason: 'INAPPROPRIATE',
      detail: 'The description is offensive.',
      goalId: goal.id,
    }).expect(201);

    // The reply is a receipt and nothing else. A name, a count, even "this person has been
    // reported before" would turn the report form into a way to probe an anonymous poster.
    expect(res.body).toEqual({ received: true });
    expect(JSON.stringify(res.body)).not.toContain('Poster Name');
    expect(JSON.stringify(res.body)).not.toContain(poster.id);
  });

  it('resolves the subject server-side, even when the poster is anonymous', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const goal = await postGoal(poster, { anonymous: true });

    await fileReport(student, { reason: 'SPAM', goalId: goal.id }).expect(201);

    const stored = await prisma.report.findFirstOrThrow();
    expect(stored.subjectId).toBe(poster.id);
  });

  it('refuses a report with no goal, message or student named', async () => {
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    await fileReport(student, { reason: 'SPAM' }).expect(400);
  });

  it('refuses to let anybody report themselves', async () => {
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const goal = await postGoal(student);
    await fileReport(student, { reason: 'SPAM', goalId: goal.id }).expect(400);
  });

  it('refuses a second open report about the same student', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const goal = await postGoal(poster);

    await fileReport(student, { reason: 'SPAM', goalId: goal.id }).expect(201);
    const second = await fileReport(student, { reason: 'HARASSMENT', goalId: goal.id }).expect(409);
    expect(second.body.error.code).toBe('CONFLICT');
  });

  it('refuses to report a message from a chat the reporter cannot read', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const outsider = await registerVerifiedUser('outsider_be24@thapar.edu');
    const goal = await postGoal(poster);
    const sent = await request(app)
      .post(`/api/goals/${goal.id}/messages`)
      .set(poster.auth)
      .send({ body: 'private planning' })
      .expect(201);

    // A message id would otherwise be a way to file reports about conversations you were never in.
    await fileReport(outsider, {
      reason: 'HARASSMENT',
      messageId: sent.body.message.id,
    }).expect(404);
  });
});

describe('the admin area', () => {
  it('refuses an ordinary student', async () => {
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    await request(app).get('/api/admin/reports').set(student.auth).expect(403);
    await request(app).get('/api/admin/audit').set(student.auth).expect(403);
  });

  it('refuses a token minted before the account was demoted', async () => {
    const admin = await registerVerifiedUser('admin_be24@thapar.edu');
    await makeAdmin(admin);
    await request(app).get('/api/admin/reports').set(admin.auth).expect(200);

    // The role lives in the JWT too, and trusting it here would keep a demoted moderator working
    // until their session expired. requireAdmin reads the database instead.
    await prisma.user.update({ where: { id: admin.id }, data: { role: USER_ROLE.STUDENT } });
    await request(app).get('/api/admin/reports').set(admin.auth).expect(403);
  });

  it('lists reports without naming an anonymous subject', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu', 'Hidden Poster');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const admin = await registerVerifiedUser('admin_be24@thapar.edu');
    await makeAdmin(admin);
    const goal = await postGoal(poster, { anonymous: true });
    await fileReport(student, { reason: 'SAFETY', goalId: goal.id }).expect(201);

    const res = await request(app).get('/api/admin/reports').set(admin.auth).expect(200);
    const [report] = res.body.reports;
    expect(report.subject.isAnonymous).toBe(true);
    expect(report.subject.name).toBeNull();
    // Moderation work does not need the name, so doing it must not hand one over.
    expect(JSON.stringify(res.body)).not.toContain('Hidden Poster');
  });

  it('names a subject who was never anonymous, with nothing to unmask', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu', 'Open Poster');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const admin = await registerVerifiedUser('admin_be24@thapar.edu');
    await makeAdmin(admin);
    const goal = await postGoal(poster);
    await fileReport(student, { reason: 'SPAM', goalId: goal.id }).expect(201);

    const res = await request(app).get('/api/admin/reports').set(admin.auth).expect(200);
    expect(res.body.reports[0].subject.name).toBe('Open Poster');
    expect(res.body.reports[0].subject.isAnonymous).toBe(false);
  });
});

describe('unmasking, and the trail it leaves', () => {
  async function reportedAnonymousGoal() {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu', 'Hidden Poster');
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const admin = await registerVerifiedUser('admin_be24@thapar.edu', 'Moderator');
    await makeAdmin(admin);
    const goal = await postGoal(poster, { anonymous: true });
    await fileReport(student, { reason: 'SAFETY', goalId: goal.id }).expect(201);
    const report = await prisma.report.findFirstOrThrow();
    return { poster, student, admin, goal, reportId: report.id };
  }

  it('reveals the student, and writes an audit entry naming the admin who did it', async () => {
    const { admin, reportId } = await reportedAnonymousGoal();

    const res = await request(app)
      .post(`/api/admin/reports/${reportId}/unmask`)
      .set(admin.auth)
      .expect(200);
    expect(res.body.subject.name).toBe('Hidden Poster');
    expect(res.body.subject.email).toBe('poster_be24@thapar.edu');

    const entries = await prisma.auditLog.findMany();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.action).toBe('UNMASK_POSTER');
    expect(entries[0]?.actorId).toBe(admin.id);
    // The entry has to say who was revealed, or it records that something happened without
    // recording what — which is no use to anybody reviewing a moderator later.
    expect(entries[0]?.detail).toContain('poster_be24@thapar.edu');
  });

  it('records every unmask, not just the first', async () => {
    const { admin, reportId } = await reportedAnonymousGoal();

    await request(app).post(`/api/admin/reports/${reportId}/unmask`).set(admin.auth).expect(200);
    await request(app).post(`/api/admin/reports/${reportId}/unmask`).set(admin.auth).expect(200);

    // Looking twice is looking twice. A log that collapsed repeats would hide how often an
    // identity was pulled up.
    expect(await prisma.auditLog.count({ where: { action: 'UNMASK_POSTER' } })).toBe(2);
  });

  it('never lets an ordinary student unmask anybody', async () => {
    const { student, reportId } = await reportedAnonymousGoal();

    await request(app).post(`/api/admin/reports/${reportId}/unmask`).set(student.auth).expect(403);
    expect(await prisma.auditLog.count()).toBe(0);
  });

  it('shows the trail to an admin, newest first', async () => {
    const { admin, reportId } = await reportedAnonymousGoal();
    await request(app).post(`/api/admin/reports/${reportId}/unmask`).set(admin.auth).expect(200);
    await request(app)
      .post(`/api/admin/reports/${reportId}/review`)
      .set(admin.auth)
      .send({ status: 'ACTIONED', note: 'Warned the student' })
      .expect(200);

    const res = await request(app).get('/api/admin/audit').set(admin.auth).expect(200);
    expect(res.body.entries.map((e: { action: string }) => e.action)).toEqual([
      'REVIEW_REPORT',
      'UNMASK_POSTER',
    ]);
    expect(res.body.entries[0].actor.name).toBe('Moderator');
  });

  it('closes a report, and refuses to close it twice', async () => {
    const { admin, reportId } = await reportedAnonymousGoal();

    await request(app)
      .post(`/api/admin/reports/${reportId}/review`)
      .set(admin.auth)
      .send({ status: 'DISMISSED' })
      .expect(200);
    await request(app)
      .post(`/api/admin/reports/${reportId}/review`)
      .set(admin.auth)
      .send({ status: 'ACTIONED' })
      .expect(409);
  });

  it('lets a student report again once the first was dealt with', async () => {
    const { student, admin, goal, reportId } = await reportedAnonymousGoal();
    await request(app)
      .post(`/api/admin/reports/${reportId}/review`)
      .set(admin.auth)
      .send({ status: 'DISMISSED' })
      .expect(200);

    // The one-open-report rule is there to stop the queue being buried, not to silence somebody
    // whose first complaint went nowhere.
    await fileReport(student, { reason: 'HARASSMENT', goalId: goal.id }).expect(201);
  });
});
