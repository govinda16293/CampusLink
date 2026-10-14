import { io } from 'socket.io-client';

/**
 * The one socket connection for the whole app.
 *
 * A single connection multiplexed across rooms, rather than one per chat: a student with three
 * lobbies open should cost the server one connection, not three. Rooms are joined and left as
 * components mount and unmount.
 *
 * The connection carries the session token in its handshake. It is created lazily — a signed-out
 * visitor on the login page never opens one — and torn down on sign-out, so a socket authorised
 * as the previous user cannot outlive their session.
 */

/**
 * Where the socket connects.
 *
 * In development this is the same origin as the page: Vite proxies `/socket.io` through to the
 * API, so the browser talks to one host and there is no CORS in the way. In production
 * `VITE_API_URL` is an absolute URL and the socket goes to that server's origin.
 */
function socketUrl() {
  const base = import.meta.env.VITE_API_URL;
  if (!base || base.startsWith('/')) return undefined;
  try {
    return new URL(base).origin;
  } catch {
    return undefined;
  }
}

let socket = null;
let socketToken = null;

/** The live connection for this token, opening one if needed. Null when signed out. */
export function getSocket(token) {
  if (!token) return null;

  // A different token means a different person. Never reuse a connection authorised as someone
  // else — the server decided what rooms it may enter from the token it was handed.
  if (socket && socketToken !== token) closeSocket();

  if (!socket) {
    socketToken = token;
    socket = io(socketUrl(), {
      auth: { token },
      // Skip the HTTP long-polling handshake: the dev proxy and every target host support
      // WebSocket, and polling first would double the connection setup for no benefit.
      transports: ['websocket'],
    });
  }
  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
  socketToken = null;
}
