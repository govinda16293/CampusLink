/**
 * The seam between the service layer and the socket server.
 *
 * Services announce that something happened; they do not know a WebSocket exists. That matters
 * for three reasons: the HTTP API keeps working with no socket server attached (which is exactly
 * how the integration tests run), a service can be unit-tested without standing one up, and
 * there is no import cycle between a module that owns sockets and the services it has to call.
 *
 * Until `setPublisher` is called at boot this is a no-op, so a message still saves and still
 * comes back on the next read — real-time is an enhancement on top of a working API, never a
 * dependency of it.
 */

export type LobbyEvent = 'message:new' | 'lobby:evicted';

type Publisher = (goalId: string, event: LobbyEvent, payload: unknown) => void;
type Evictor = (goalId: string, userId: string) => void;

let publisher: Publisher | null = null;
let evictor: Evictor | null = null;

export function setPublisher(next: Publisher | null) {
  publisher = next;
}

export function setEvictor(next: Evictor | null) {
  evictor = next;
}

/** Fan a lobby event out to everyone currently in that lobby's room. */
export function publish(goalId: string, event: LobbyEvent, payload: unknown) {
  publisher?.(goalId, event, payload);
}

/**
 * Remove one person's live connections from a lobby's room.
 *
 * Called the moment they stop being a member — they leave, or the poster declines them. Without
 * it, the membership check that ran when they joined the room would be the last one ever made,
 * and an open tab would keep receiving a group's messages after its owner was no longer in the
 * group. The HTTP endpoints re-check on every single call; this is what gives the socket the
 * same property.
 */
export function evict(goalId: string, userId: string) {
  evictor?.(goalId, userId);
}
