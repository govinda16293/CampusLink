import type { Server as HttpServer } from 'node:http';
import { Server as IOServer, type Socket } from 'socket.io';
import { corsOrigins } from '../config/env.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { assertLobbyAccess } from '../modules/messages/messages.service.js';
import { setEvictor, setPublisher, type LobbyEvent } from './bus.js';

/**
 * The real-time layer.
 *
 * **The socket cannot write anything.** There is no handler here that creates a message, accepts
 * a join request or changes a goal — the only events it listens for are "put me in this room" and
 * "take me out". Everything that changes state goes through the HTTP API, through the same
 * services and the same authorization the rest of the app uses. A socket that could also write
 * would be a second door into a room full of real names, and the weaker of two doors is the one
 * that gets forgotten about.
 *
 * So the security surface here is exactly one question: who is allowed into a room. It is
 * answered twice —
 *
 *   1. At connection, by the same JWT the HTTP API uses. No token, no socket.
 *   2. At every join, by `assertLobbyAccess` — the very function the HTTP endpoints call. A room
 *      name arriving from a client is never trusted on sight.
 *
 * and then kept true afterwards by `evict`, because a check that runs only at join time is a
 * check that stops being true the moment somebody leaves the group.
 */

/** One room per goal. Prefixed so a goal id can never collide with any other room we add later. */
const roomFor = (goalId: string) => `goal:${goalId}`;

interface SocketData {
  userId: string;
}

export function attachRealtime(httpServer: HttpServer) {
  const io = new IOServer(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
    // The chat is small messages; this keeps a hostile client from parking memory on the server.
    maxHttpBufferSize: 1e6,
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string' || token.length === 0) {
      return next(new Error('UNAUTHORIZED'));
    }
    try {
      const payload = verifyAccessToken(token);
      (socket.data as SocketData).userId = payload.sub;
      next();
    } catch {
      // Same opaque failure as the HTTP 401: which part of a forged token to fix next is not
      // something the server should help with.
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const { userId } = socket.data as SocketData;

    socket.on('lobby:join', async (goalId: unknown, ack?: (result: unknown) => void) => {
      if (typeof goalId !== 'string') {
        ack?.({ ok: false, error: 'BAD_REQUEST' });
        return;
      }
      try {
        // The same function the HTTP endpoints call, hitting the database every time. Membership
        // is never read from the handshake or cached on the connection.
        await assertLobbyAccess(userId, goalId);
        await socket.join(roomFor(goalId));
        ack?.({ ok: true });
      } catch {
        // Indistinguishable from a goal that does not exist, as everywhere else in the lobby.
        ack?.({ ok: false, error: 'NOT_FOUND' });
      }
    });

    socket.on('lobby:leave', async (goalId: unknown) => {
      if (typeof goalId === 'string') await socket.leave(roomFor(goalId));
    });
  });

  setPublisher((goalId: string, event: LobbyEvent, payload: unknown) => {
    io.to(roomFor(goalId)).emit(event, payload);
  });

  setEvictor((goalId: string, userId: string) => {
    void (async () => {
      const room = roomFor(goalId);
      const sockets = await io.in(room).fetchSockets();
      for (const socket of sockets) {
        if ((socket.data as SocketData).userId !== userId) continue;
        socket.leave(room);
        // Told, not just disconnected: their open tab can close the chat and say why, rather
        // than sitting there looking like a conversation that has gone quiet.
        socket.emit('lobby:evicted', { goalId });
      }
    })();
  });

  return io;
}
