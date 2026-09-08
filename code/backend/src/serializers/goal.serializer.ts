import type { Goal, User } from '@prisma/client';
import { toPublicUserDTO } from './user.serializer.js';

/**
 * Turns a goal row into what a particular viewer is allowed to see.
 *
 * **This is where anonymous posting is enforced, and it is the only place.** The UI is never
 * trusted to hide identity: if a poster chose to be anonymous, their name, photo and id do not
 * leave the server at all for viewers who have not earned them. A client cannot reveal what it
 * was never sent.
 *
 * Per proposal §3.3, anonymity is a pre-acceptance shield, not a permanent one:
 *
 *   - The feed shows category, description, date/time, headcount and the poster's reliability
 *     score. Identity is withheld.
 *   - Reliability stays visible while anonymous, so a requester can still judge whether the
 *     person is worth committing time to without knowing who they are.
 *   - Once a requester is accepted into the lobby, the poster's full profile becomes visible to
 *     that specific requester — `viewerCanSeePoster` carries that decision in from the service.
 *   - The poster always sees their own goal unmasked.
 *
 * Admin unmasking after a report is a separate, audit-logged path (Step 8). It deliberately does
 * not run through here, so it can never be reached by an ordinary feed request.
 */
export interface GoalViewerContext {
  /** The signed-in student's id. */
  viewerId: string;
  /**
   * True when the viewer holds an accepted request on this goal. Supplied by the service, which
   * loads it in one query for the whole page rather than per card. Always false in Step 3, since
   * requests do not exist until Step 4.
   */
  viewerIsAcceptedMember?: boolean;
}

type GoalWithPoster = Goal & { poster: User };

export function toGoalDTO(goal: GoalWithPoster, viewer: GoalViewerContext) {
  const isOwnGoal = goal.posterId === viewer.viewerId;
  const identityRevealed = !goal.anonymous || isOwnGoal || viewer.viewerIsAcceptedMember === true;

  return {
    id: goal.id,
    category: goal.category,
    title: goal.title,
    description: goal.description,
    dateTime: goal.dateTime?.toISOString() ?? null,
    headcount: goal.headcount,
    acceptedCount: goal.acceptedCount,
    spotsLeft: Math.max(0, goal.headcount - goal.acceptedCount),
    genderPreference: goal.genderPreference,
    autoAccept: goal.autoAccept,
    anonymous: goal.anonymous,
    status: goal.status,
    expiresAt: goal.expiresAt?.toISOString() ?? null,
    createdAt: goal.createdAt.toISOString(),

    /** True when this goal belongs to the person asking, so the UI can offer poster controls. */
    isOwnGoal,

    poster: identityRevealed
      ? { isAnonymous: false, ...toPublicUserDTO(goal.poster) }
      : {
          // No id, no name, no photo. Only what a requester needs to judge trustworthiness.
          isAnonymous: true,
          reliabilityScore: goal.poster.reliabilityScore,
          goalsCompleted: goal.poster.goalsCompleted,
        },
  };
}
