import type { Goal, JoinRequest, User } from '@prisma/client';
import { lobbyStatusOf } from '../domain/goal.js';
import { toPublicUserDTO } from './user.serializer.js';

type GoalWithPoster = Goal & { poster: User };
type MemberRequest = JoinRequest & { requester: User };

/**
 * The lobby: who is actually going, as the group itself sees it.
 *
 * Reached only after `canViewLobby` has said yes, which is why this is the one DTO that shows a
 * poster's real name unconditionally — by the time anybody can call it, either they are the
 * poster or they were accepted, and acceptance is exactly what lifts anonymous posting. The
 * anonymity rule is not weakened here; it has already been satisfied at the door.
 *
 * Members travel as public profiles, so no email address leaves the server even inside a group.
 */
export function toLobbyDTO(goal: GoalWithPoster, members: MemberRequest[]) {
  return {
    goalId: goal.id,
    title: goal.title,
    status: lobbyStatusOf(goal.status),
    goalStatus: goal.status,
    dateTime: goal.dateTime?.toISOString() ?? null,
    headcount: goal.headcount,
    acceptedCount: goal.acceptedCount,
    // The poster is in the lobby too, and is not one of its `members` — they never made a request
    // to join their own goal, so there is no row for them to come from.
    poster: toPublicUserDTO(goal.poster),
    members: members.map((member) => ({
      ...toPublicUserDTO(member.requester),
      /** When they were accepted, so the roster can read in the order people actually joined. */
      joinedAt: (member.decidedAt ?? member.createdAt).toISOString(),
    })),
  };
}
