import { GENDER, GENDER_PREFERENCE, GOAL_STATUS, REQUEST_STATUS } from '@campuslink/shared';

/**
 * The join-request state machine, as pure functions.
 *
 * No database and no HTTP, which is the point: every legal and illegal move can be tested
 * exhaustively in milliseconds, and the service, the serializer and the tests all consult this
 * one table rather than each re-deriving the rules. The goal page learns whether a student may
 * ask to join from the very `joinEligibility` call the API enforces, so the button and the
 * endpoint cannot disagree.
 *
 *   PENDING   --accept-->   ACCEPTED
 *   PENDING   --reject-->   REJECTED    terminal: a declined student may not simply ask again
 *   PENDING   --withdraw--> WITHDRAWN
 *   ACCEPTED  --withdraw--> WITHDRAWN   and the spot goes back to the goal
 *   WITHDRAWN --reopen-->   PENDING     asking again reuses the same request
 */

export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
export type RequestAction = 'accept' | 'reject' | 'withdraw' | 'reopen';

const TRANSITIONS: Record<RequestStatus, Partial<Record<RequestAction, RequestStatus>>> = {
  PENDING: { accept: 'ACCEPTED', reject: 'REJECTED', withdraw: 'WITHDRAWN' },
  ACCEPTED: { withdraw: 'WITHDRAWN' },
  REJECTED: {},
  WITHDRAWN: { reopen: 'PENDING' },
};

/** Where a request goes next, or null when the move is not allowed. */
export function nextStatus(from: string, action: RequestAction): RequestStatus | null {
  return TRANSITIONS[from as RequestStatus]?.[action] ?? null;
}

/** Whether a goal's gender preference admits a student. */
export function genderAllows(preference: string, gender: string): boolean {
  if (preference === GENDER_PREFERENCE.FEMALE_ONLY) return gender === GENDER.FEMALE;
  if (preference === GENDER_PREFERENCE.MALE_ONLY) return gender === GENDER.MALE;
  return true;
}

export type IneligibleReason =
  | 'OWN_GOAL'
  | 'NOT_OPEN'
  | 'EXPIRED'
  | 'ALREADY_ACCEPTED'
  | 'ALREADY_PENDING'
  | 'DECLINED'
  | 'FULL'
  | 'GENDER';

export type Eligibility =
  | { canRequest: true; reason: null; message: null }
  | { canRequest: false; reason: IneligibleReason; message: string };

export interface EligibilityInput {
  goal: {
    posterId: string;
    status: string;
    expiresAt: Date | null;
    headcount: number;
    acceptedCount: number;
    genderPreference: string;
  };
  viewerId: string;
  viewerGender: string;
  /** The status of the viewer's existing request on this goal, if they have one. */
  existingStatus: string | null;
  now?: Date;
}

const blocked = (reason: IneligibleReason, message: string): Eligibility => ({
  canRequest: false,
  reason,
  message,
});

/**
 * Whether this student may ask to join this goal right now, and if not, why.
 *
 * The order of the checks is part of the specification, not an accident of how it was written:
 *
 *   1. A goal that is over is over, whatever else is true.
 *   2. The student's own history comes before capacity, so somebody already accepted onto a goal
 *      that has since filled is told they are in, not that it is full.
 *   3. Capacity comes before gender, so a full goal never reads as a personal refusal.
 */
export function joinEligibility({
  goal,
  viewerId,
  viewerGender,
  existingStatus,
  now = new Date(),
}: EligibilityInput): Eligibility {
  if (goal.posterId === viewerId) return blocked('OWN_GOAL', 'This is your own goal.');

  if (goal.status !== GOAL_STATUS.OPEN && goal.status !== GOAL_STATUS.FULL) {
    return blocked('NOT_OPEN', 'This goal is no longer taking requests.');
  }

  // Enforced here rather than left to a sweep job. The feed already hides expired goals, but a
  // link to one can still be opened, and joining something that has already happened is nonsense.
  if (goal.expiresAt && goal.expiresAt.getTime() <= now.getTime()) {
    return blocked('EXPIRED', 'This goal has already happened.');
  }

  if (existingStatus === REQUEST_STATUS.ACCEPTED) {
    return blocked('ALREADY_ACCEPTED', 'You are already in.');
  }
  if (existingStatus === REQUEST_STATUS.PENDING) {
    return blocked(
      'ALREADY_PENDING',
      'You have already asked to join. The poster has not decided yet.',
    );
  }
  if (existingStatus === REQUEST_STATUS.REJECTED) {
    return blocked('DECLINED', 'The poster declined your request, so you cannot ask again.');
  }

  if (goal.status === GOAL_STATUS.FULL || goal.acceptedCount >= goal.headcount) {
    return blocked('FULL', 'Every spot on this goal is taken.');
  }

  if (!genderAllows(goal.genderPreference, viewerGender)) {
    const who = goal.genderPreference === GENDER_PREFERENCE.FEMALE_ONLY ? 'women' : 'men';
    return blocked(
      'GENDER',
      viewerGender === GENDER.UNDISCLOSED
        ? `This goal is open to ${who} only. If that includes you, add your gender to your profile.`
        : `This goal is open to ${who} only.`,
    );
  }

  return { canRequest: true, reason: null, message: null };
}
