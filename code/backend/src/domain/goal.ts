import { GOAL_STATUS, LOBBY_STATUS, REQUEST_STATUS } from '@campuslink/shared';

/**
 * The goal lifecycle — and with it the lobby lifecycle — as pure functions.
 *
 * **There is no Lobby table, and that is a deliberate design decision.** The class diagram names
 * Lobby as an entity, but a lobby has no state of its own: it is exactly one goal plus the people
 * whose requests were accepted onto it. Giving it a table would mean two rows that must agree
 * about whether the group is still forming — `Goal.status` and `Lobby.status` — and the day they
 * disagree there is no way to say which is right. So the goal *is* the lobby, and `lobbyStatusOf`
 * below is the mapping the class diagram describes:
 *
 *   OPEN / FULL   → FORMING     still gathering people (FULL only means no spots left)
 *   CLOSED        → CONFIRMED   the poster locked the group in; nobody else can join
 *   COMPLETED     → COMPLETED   it happened
 *   CANCELLED     → CANCELLED   called off
 *   ARCHIVED      → CANCELLED   expired without ever being confirmed (Step 11's sweep)
 *
 * The transitions, like the request machine in joinRequest.ts, live in one table that the
 * service, the serializer and the tests all consult rather than each re-deriving:
 *
 *   OPEN      --close-->    CLOSED      lock the group in, even below headcount
 *   FULL      --close-->    CLOSED
 *   CLOSED    --complete--> COMPLETED   terminal: feeds the fulfilment metric in Step 11
 *   CLOSED    --reopen-->   OPEN        changed your mind before it happened
 *   OPEN      --cancel-->   CANCELLED
 *   FULL      --cancel-->   CANCELLED
 *   CLOSED    --cancel-->   CANCELLED   a confirmed plan can still fall through
 */

export type GoalStatus = 'OPEN' | 'FULL' | 'CLOSED' | 'COMPLETED' | 'ARCHIVED' | 'CANCELLED';
export type GoalAction = 'close' | 'complete' | 'reopen' | 'cancel';

const TRANSITIONS: Record<GoalStatus, Partial<Record<GoalAction, GoalStatus>>> = {
  OPEN: { close: 'CLOSED', cancel: 'CANCELLED' },
  FULL: { close: 'CLOSED', cancel: 'CANCELLED' },
  // Reopening returns a goal to OPEN rather than FULL. The service recomputes which of the two it
  // really is from the seat count, because members may have left while it was closed.
  CLOSED: { complete: 'COMPLETED', reopen: 'OPEN', cancel: 'CANCELLED' },
  COMPLETED: {},
  ARCHIVED: {},
  CANCELLED: {},
};

/** Where a goal goes next, or null when the move is not allowed. */
export function nextGoalStatus(from: string, action: GoalAction): GoalStatus | null {
  return TRANSITIONS[from as GoalStatus]?.[action] ?? null;
}

/** The lobby state the class diagram talks about, derived from the goal's own status. */
export function lobbyStatusOf(goalStatus: string): string {
  switch (goalStatus) {
    case GOAL_STATUS.OPEN:
    case GOAL_STATUS.FULL:
      return LOBBY_STATUS.FORMING;
    case GOAL_STATUS.CLOSED:
      return LOBBY_STATUS.CONFIRMED;
    case GOAL_STATUS.COMPLETED:
      return LOBBY_STATUS.COMPLETED;
    default:
      return LOBBY_STATUS.CANCELLED;
  }
}

/**
 * Whether this viewer may see who is in the lobby.
 *
 * Membership is the whole point of the rule: the roster is the one place on CampusLink where a
 * student's name, branch and photograph are shown to people who did not already know them, so it
 * is shown only to the group itself. A stranger holding the goal's link gets nothing, and so does
 * someone whose request is still pending — being accepted is what buys you the roster.
 */
export function canViewLobby({
  posterId,
  viewerId,
  viewerRequestStatus,
}: {
  posterId: string;
  viewerId: string;
  viewerRequestStatus: string | null;
}): boolean {
  return posterId === viewerId || viewerRequestStatus === REQUEST_STATUS.ACCEPTED;
}
