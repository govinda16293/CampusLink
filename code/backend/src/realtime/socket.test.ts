import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client';
import request from 'supertest';
import type { Server as IOServer } from 'socket.io';
import { createApp } from '../app.js';
import { resetDatabase, setKnownOtp } from '../test/helpers.js';
import { setEvictor, setPublisher } from './bus.js';
import { attachRealtime } from './socket.js';

/**
 * Step 6 — the real-time layer.
 *
 * Driven through a real socket.io client against a real server, because the things worth testing
 * here only exist in the wiring: a handshake that refuses a bad token, a join that re-checks
 * membership in the database, and an eviction that reaches a connection which has already been
 * let in. None of that is reachable from supertest.
 */

const app = createApp();
let httpServer: HttpServer;
let ioServer: IOServer;
let url: string;
const clients: ClientSocket[] = [];

beforeAll(async () => {
  httpServer = createServer(app);
  ioServer = attachRealtime(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
});

afterAll(async () => {
  for (const client of clients) client.disconnect();
  ioServer.close();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  // Leave the bus as the rest of the suite expects it: no publisher, no evictor.
  setPublisher(null);
  setEvictor(null);
});

beforeEach(resetDatabase);

afterEach(() => {
  while (clients.length > 0) clients.pop()?.disconnect();
});

type Student = { id: string; token: string; auth: { Authorization: string } };

async function registerVerifiedUser(email: string, name = 'Test Student'): Promise<Student> {
  await request(app)
    .post('/api/auth/signup')
    .send({ name, email, password: 'correct-horse-1' })
    .expect(201);
  await setKnownOtp(email, '123456');
  const res = await request(app).post('/api/auth/verify-otp').send({ email, code: '123456' });
  return {
    id: res.body.user.id,
    token: res.body.token,
    auth: { Authorization: `Bearer ${res.body.token}` },
  };
}

async function postGoal(poster: Student) {
  const res = await request(app)
    .post('/api/goals')
    .set(poster.auth)
    .send({
      category: 'STUDY',
      title: 'DBMS revision before the quiz',
      description: 'Transactions and normalisation in the library on Saturday.',
      headcount: 2,
    })
    .expect(201);
  return res.body.goal as { id: string };
}

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

/** Connects a client, or rejects with the handshake error the server sent. */
function connect(token: string | undefined): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const client = createClient(url, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      reconnection: false,
    });
    clients.push(client);
    client.on('connect', () => resolve(client));
    client.on('connect_error', (error) => reject(error));
  });
}

const joinLobby = (client: ClientSocket, goalId: string): Promise<{ ok: boolean }> =>
  new Promise((resolve) => client.emit('lobby:join', goalId, resolve));

/** Resolves with the next event of this name, or rejects if none arrives in time. */
function nextEvent<T>(client: ClientSocket, event: string, ms = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no ${event} within ${ms}ms`)), ms);
    client.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

describe('the handshake', () => {
  it('refuses a connection with no token at all', async () => {
    await expect(connect(undefined)).rejects.toThrow(/UNAUTHORIZED/);
  });

  it('refuses a forged token', async () => {
    await expect(connect('not.a.real.token')).rejects.toThrow(/UNAUTHORIZED/);
  });

  it('accepts a real session token', async () => {
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const client = await connect(student.token);
    expect(client.connected).toBe(true);
  });
});

describe('joining a lobby room', () => {
  it('lets a member in', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);

    const client = await connect(member.token);
    expect(await joinLobby(client, goal.id)).toEqual({ ok: true });
  });

  it('refuses a stranger, even with a perfectly valid session', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const stranger = await registerVerifiedUser('stranger_be24@thapar.edu');
    const goal = await postGoal(poster);

    // Being signed in is not being in the group. The room name came from the client and is
    // checked against the database rather than taken at its word.
    const client = await connect(stranger.token);
    expect(await joinLobby(client, goal.id)).toEqual({ ok: false, error: 'NOT_FOUND' });
  });

  it('refuses someone whose request is still pending', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const waiting = await registerVerifiedUser('waiting_be24@thapar.edu');
    const goal = await postGoal(poster);
    await request(app)
      .post(`/api/goals/${goal.id}/requests`)
      .set(waiting.auth)
      .send({})
      .expect(201);

    const client = await connect(waiting.token);
    expect(await joinLobby(client, goal.id)).toEqual({ ok: false, error: 'NOT_FOUND' });
  });

  it('refuses a goal id that is not a string', async () => {
    const student = await registerVerifiedUser('student_be24@thapar.edu');
    const client = await connect(student.token);
    const result = await new Promise((resolve) =>
      client.emit('lobby:join', { not: 'a string' }, resolve),
    );
    expect(result).toEqual({ ok: false, error: 'BAD_REQUEST' });
  });
});

describe('delivery', () => {
  it('pushes a message to everyone in the room the moment it is posted', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu', 'Poster');
    const member = await registerVerifiedUser('member_be24@thapar.edu', 'Member');
    const goal = await postGoal(poster);
    await join(member, poster, goal.id);

    const client = await connect(member.token);
    await joinLobby(client, goal.id);
    const delivered = nextEvent<{ message: { body: string; sender: { name: string } } }>(
      client,
      'message:new',
    );

    await request(app)
      .post(`/api/goals/${goal.id}/messages`)
      .set(poster.auth)
      .send({ body: 'Library, second floor' })
      .expect(201);

    const payload = await delivered;
    expect(payload.message.body).toBe('Library, second floor');
    expect(payload.message.sender.name).toBe('Poster');
  });

  it('does not push a lobby’s messages to a room nobody joined', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const other = await registerVerifiedUser('other_be24@thapar.edu');
    const goalA = await postGoal(poster);
    const goalB = await postGoal(other);

    const client = await connect(other.token);
    await joinLobby(client, goalB.id);
    const leaked = nextEvent(client, 'message:new', 500);

    await request(app)
      .post(`/api/goals/${goalA.id}/messages`)
      .set(poster.auth)
      .send({ body: 'not for you' })
      .expect(201);

    await expect(leaked).rejects.toThrow(/no message:new/);
  });
});

describe('eviction — the check that keeps being true after the join', () => {
  it('stops delivering to someone who leaves the group, and tells their tab', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const member = await registerVerifiedUser('member_be24@thapar.edu');
    const goal = await postGoal(poster);
    const requestId = await join(member, poster, goal.id);

    const client = await connect(member.token);
    await joinLobby(client, goal.id);
    const evicted = nextEvent<{ goalId: string }>(client, 'lobby:evicted');

    await request(app).post(`/api/requests/${requestId}/withdraw`).set(member.auth).expect(200);
    expect(await evicted).toEqual({ goalId: goal.id });

    // And the room really is closed to them: a message sent afterwards must not arrive.
    const leaked = nextEvent(client, 'message:new', 500);
    await request(app)
      .post(`/api/goals/${goal.id}/messages`)
      .set(poster.auth)
      .send({ body: 'members only now' })
      .expect(201);
    await expect(leaked).rejects.toThrow(/no message:new/);
  });

  it('evicts only the person who left, not the rest of the lobby', async () => {
    const poster = await registerVerifiedUser('poster_be24@thapar.edu');
    const stays = await registerVerifiedUser('stays_be24@thapar.edu');
    const leaves = await registerVerifiedUser('leaves_be24@thapar.edu');
    const goal = await postGoal(poster);
    await join(stays, poster, goal.id);
    const leavingRequest = await join(leaves, poster, goal.id);

    const stayingClient = await connect(stays.token);
    await joinLobby(stayingClient, goal.id);
    const leavingClient = await connect(leaves.token);
    await joinLobby(leavingClient, goal.id);

    await request(app)
      .post(`/api/requests/${leavingRequest}/withdraw`)
      .set(leaves.auth)
      .expect(200);

    const stillDelivered = nextEvent<{ message: { body: string } }>(stayingClient, 'message:new');
    await request(app)
      .post(`/api/goals/${goal.id}/messages`)
      .set(poster.auth)
      .send({ body: 'still here' })
      .expect(201);
    expect((await stillDelivered).message.body).toBe('still here');
  });
});
