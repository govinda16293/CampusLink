import { describe, expect, it } from 'vitest';
import { GOAL_STATUSES, LOBBY_STATUS } from '@campuslink/shared';
import { canViewLobby, lobbyStatusOf, nextGoalStatus, type GoalAction } from './goal.js';

const ACTIONS: GoalAction[] = ['close', 'complete', 'reopen', 'cancel'];

/**
 * The specification, written out independently of the implementation's table. Every status is
 * tried against every action, so a move nobody intended to allow — completing a goal that was
 * never confirmed, reopening a cancelled one — fails a test rather than quietly becoming
 * possible.
 */
const LEGAL: Record<string, Partial<Record<GoalAction, string>>> = {
  OPEN: { close: 'CLOSED', cancel: 'CANCELLED' },
  FULL: { close: 'CLOSED', cancel: 'CANCELLED' },
  CLOSED: { complete: 'COMPLETED', reopen: 'OPEN', cancel: 'CANCELLED' },
  COMPLETED: {},
  ARCHIVED: {},
  CANCELLED: {},
};

describe('nextGoalStatus — the goal and lobby state machine', () => {
  it('covers exactly the goal statuses the rest of the app knows about', () => {
    expect(Object.keys(LEGAL).sort()).toEqual([...GOAL_STATUSES].sort());
  });

  for (const from of Object.keys(LEGAL)) {
    for (const action of ACTIONS) {
      const expected = LEGAL[from]?.[action] ?? null;
      it(`${from} --${action}--> ${expected ?? 'refused'}`, () => {
        expect(nextGoalStatus(from, action)).toBe(expected);
      });
    }
  }

  it('refuses every action on a status it does not recognise', () => {
    for (const action of ACTIONS) expect(nextGoalStatus('NONSENSE', action)).toBeNull();
  });

  it('never lets a finished goal start accepting people again', () => {
    for (const from of ['COMPLETED', 'ARCHIVED', 'CANCELLED']) {
      expect(nextGoalStatus(from, 'reopen')).toBeNull();
    }
  });
});

describe('lobbyStatusOf — the Lobby of the class diagram, derived from the goal', () => {
  it.each([
    ['OPEN', LOBBY_STATUS.FORMING],
    ['FULL', LOBBY_STATUS.FORMING],
    ['CLOSED', LOBBY_STATUS.CONFIRMED],
    ['COMPLETED', LOBBY_STATUS.COMPLETED],
    ['CANCELLED', LOBBY_STATUS.CANCELLED],
    ['ARCHIVED', LOBBY_STATUS.CANCELLED],
  ])('a %s goal has a %s lobby', (goalStatus, expected) => {
    expect(lobbyStatusOf(goalStatus)).toBe(expected);
  });

  it('maps every goal status to a real lobby status', () => {
    for (const status of GOAL_STATUSES) {
      expect(Object.values(LOBBY_STATUS)).toContain(lobbyStatusOf(status));
    }
  });
});

describe('canViewLobby', () => {
  const poster = 'poster-1';

  it('lets the poster see their own lobby', () => {
    expect(canViewLobby({ posterId: poster, viewerId: poster, viewerRequestStatus: null })).toBe(
      true,
    );
  });

  it('lets an accepted member see it', () => {
    expect(
      canViewLobby({ posterId: poster, viewerId: 'other', viewerRequestStatus: 'ACCEPTED' }),
    ).toBe(true);
  });

  it.each([null, 'PENDING', 'REJECTED', 'WITHDRAWN'])(
    'refuses someone whose request is %s',
    (status) => {
      expect(
        canViewLobby({ posterId: poster, viewerId: 'other', viewerRequestStatus: status }),
      ).toBe(false);
    },
  );
});
