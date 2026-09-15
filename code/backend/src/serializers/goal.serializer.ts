import type { Goal, User } from '@prisma/client';
import { REQUEST_STATUS } from '@campuslink/shared';
import { joinEligibility } from '../domain/joinRequest.js';
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
 *     that specific requester — the viewer's own request, loaded by the service, decides it.
 *   - The poster always sees their own goal unmasked.
 *
 * Admin unmasking after a report is a separate, audit-logged path (Step 8). It deliberately does
 * not run through here, so it can never be reached by an ordinary feed request.
 */
export interface GoalViewerContext {
  /** The signed-in student's id. */
  viewerId: string;
  /**
   * The viewer's gender, so the goal can say up front whether they may ask to join. Required
   * rather than optional: defaulting it would quietly tell every student they are ineligible for
   * every restricted goal.
   */
  viewerGender: string;
  /**
   * The viewer's own request on this goal, or null. Loaded by the service for a whole page in one
   * query rather than per card. An accepted request is what lifts anonymity.
   */
  viewerRequest: { id: string; status: string } | null;
}

type GoalWithPoster = Goal & { poster: User };

export function toGoalDTO(goal: GoalWithPoster, viewer: GoalViewerContext) {
  const isOwnGoal = goal.posterId === viewer.viewerId;
  const isAcceptedMember = viewer.viewerRequest?.status === REQUEST_STATUS.ACCEPTED;
  const identityRevealed = !goal.anonymous || isOwnGoal || isAcceptedMember;

  // The same function the API enforces a join request with, so the button the page shows and the
  // answer the endpoint gives cannot disagree.
  const eligibility = joinEligibility({
    goal,
    viewerId: viewer.viewerId,
    viewerGender: viewer.viewerGender,
    existingStatus: viewer.viewerRequest?.status ?? null,
  });

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

    /** Where the viewer stands on this goal: their request, and whether they may make one. */
    viewerRequest: viewer.viewerRequest,
    viewerCanRequest: eligibility.canRequest,
    viewerRequestBlockedReason: eligibility.reason,
    viewerRequestBlockedMessage: eligibility.message,

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
