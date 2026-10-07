import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { GOAL_STATUS, REQUEST_STATUS, type joinRequestSchema } from '@campuslink/shared';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../lib/AppError.js';
import {
  joinEligibility,
  nextStatus,
  type IneligibleReason,
  type RequestAction,
} from '../../domain/joinRequest.js';
import { toGoalDTO } from '../../serializers/goal.serializer.js';
import { toJoinRequestDTO } from '../../serializers/joinRequest.serializer.js';
import { viewerContextFor } from '../goals/goals.service.js';

type JoinRequestInput = z.infer<typeof joinRequestSchema>;

/**
 * Join requests: asking, deciding and withdrawing.
 *
 * The rules live in domain/joinRequest.ts. This file applies them against the database, and its
 * one real job beyond that is keeping `Goal.acceptedCount` honest when two people act at the same
 * moment — see `claimSeat`.
 */

/** Refusing your own goal or your gender is a permission question; the rest are state clashes. */
const HTTP_STATUS_FOR: Record<IneligibleReason, number> = {
  OWN_GOAL: 403,
  GENDER: 403,
  NOT_OPEN: 409,
  EXPIRED: 409,
  ALREADY_ACCEPTED: 409,
  ALREADY_PENDING: 409,
  DECLINED: 409,
  FULL: 409,
};

const PAST_TENSE: Record<RequestAction, string> = {
  accept: 'accepted',
  reject: 'declined',
  withdraw: 'withdrawn',
  reopen: 'reopened',
};

function invalidTransition(from: string, action: RequestAction) {
  return new AppError(
    409,
    'INVALID_TRANSITION',
    `A ${from.toLowerCase()} request cannot be ${PAST_TENSE[action]}.`,
  );
}

/**
 * Takes one spot on a goal, or fails if none is left.
 *
 * A compare-and-set on the count that was read: the update only lands if nobody changed
 * `acceptedCount` in between. When two accepts race for the last spot both read the same count,
 * exactly one update matches, and the other affects no rows and becomes a 409. It is built from
 * single statements rather than an interactive transaction so it is correct on PostgreSQL, whose
 * default isolation would let a read-then-write race, and not merely on SQLite, which happens to
 * serialise writes.
 */
async function claimSeat(goalId: string) {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) throw AppError.notFound('That goal does not exist or has been removed');
  if (goal.status !== GOAL_STATUS.OPEN || goal.acceptedCount >= goal.headcount) {
    throw new AppError(409, 'FULL', 'Every spot on this goal is taken.');
  }

  if (!(await takeSeatIfUnchanged(goalId, goal))) {
    throw new AppError(409, 'FULL', 'Someone else just took that spot.');
  }
}

/**
 * The compare-and-set inside `claimSeat`: take a spot only if the goal still has the count that
 * was read as `seen`, and report whether it did.
 *
 * Exported so the stale-read case can be tested directly. Two real HTTP requests fired at once
 * against SQLite execute one after the other, so they never produce the interleaving this exists
 * to stop — a test built on them passed even with this guard deleted.
 */
export async function takeSeatIfUnchanged(
  goalId: string,
  seen: { acceptedCount: number; headcount: number },
) {
  const taken = seen.acceptedCount + 1;
  const { count } = await prisma.goal.updateMany({
    where: { id: goalId, status: GOAL_STATUS.OPEN, acceptedCount: seen.acceptedCount },
    data: {
      acceptedCount: taken,
      status: taken >= seen.headcount ? GOAL_STATUS.FULL : GOAL_STATUS.OPEN,
    },
  });
  return count === 1;
}

/** Gives a spot back, reopening a goal that had filled. */
async function releaseSeat(goalId: string) {
  await prisma.goal.updateMany({
    where: { id: goalId, acceptedCount: { gt: 0 } },
    data: { acceptedCount: { decrement: 1 } },
  });
  // Only a goal that had filled goes back to OPEN. One cancelled in the meantime stays cancelled.
  await prisma.goal.updateMany({
    where: { id: goalId, status: GOAL_STATUS.FULL },
    data: { status: GOAL_STATUS.OPEN },
  });
}

/**
 * Moves a request along the state machine.
 *
 * A compare-and-set on the status that was read, for the same reason as `claimSeat`: a poster
 * declining at the instant the student withdraws must not have both succeed. Exported for the same
 * reason as `takeSeatIfUnchanged`: only a direct call can reproduce the stale read.
 */
export async function moveRequest(
  requestId: string,
  from: string,
  action: RequestAction,
  extra: { message?: string } = {},
) {
  const to = nextStatus(from, action);
  if (!to) throw invalidTransition(from, action);

  const { count } = await prisma.joinRequest.updateMany({
    where: { id: requestId, status: from },
    data: { status: to, decidedAt: to === REQUEST_STATUS.PENDING ? null : new Date(), ...extra },
  });
  if (count === 0) {
    throw new AppError(
      409,
      'CONFLICT',
      'This request changed a moment ago. Refresh and try again.',
    );
  }
}

/** The request and its goal, both as this viewer is allowed to see them after the change. */
async function respond(viewerId: string, requestId: string) {
  const request = await prisma.joinRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: { requester: true, goal: { include: { poster: true } } },
  });
  const contextFor = await viewerContextFor(viewerId, [request.goalId]);
  return {
    request: toJoinRequestDTO(request),
    goal: toGoalDTO(request.goal, contextFor(request.goalId)),
  };
}

export async function requestToJoin(viewerId: string, goalId: string, input: JoinRequestInput) {
  const [goal, viewer, existing] = await Promise.all([
    prisma.goal.findUnique({ where: { id: goalId } }),
    prisma.user.findUnique({ where: { id: viewerId } }),
    prisma.joinRequest.findUnique({
      where: { goalId_requesterId: { goalId, requesterId: viewerId } },
    }),
  ]);

  if (!goal) throw AppError.notFound('That goal does not exist or has been removed');
  if (!viewer) throw AppError.unauthorized();
  // The schema's promise: an account that has not confirmed its college email cannot join anything.
  if (!viewer.isVerified) {
    throw new AppError(403, 'NOT_VERIFIED', 'Verify your college email before joining a goal.');
  }

  const eligibility = joinEligibility({
    goal,
    viewerId,
    viewerGender: viewer.gender,
    existingStatus: existing?.status ?? null,
  });
  if (!eligibility.canRequest) {
    throw new AppError(
      HTTP_STATUS_FOR[eligibility.reason],
      eligibility.reason,
      eligibility.message,
    );
  }

  // With auto-accept the spot is taken before anything is written, so a goal that fills in the
  // meantime produces a clean 409 and never an "accepted" request with no spot behind it.
  if (goal.autoAccept) await claimSeat(goalId);

  let requestId: string;
  try {
    if (existing) {
      await moveRequest(existing.id, existing.status, 'reopen', { message: input.message });
      if (goal.autoAccept) await moveRequest(existing.id, REQUEST_STATUS.PENDING, 'accept');
      requestId = existing.id;
    } else {
      const created = await prisma.joinRequest.create({
        data: {
          goalId,
          requesterId: viewerId,
          message: input.message,
          // Auto-accept is the poster's decision made in advance, so the request is born accepted.
          status: goal.autoAccept ? REQUEST_STATUS.ACCEPTED : REQUEST_STATUS.PENDING,
          decidedAt: goal.autoAccept ? new Date() : null,
        },
      });
      requestId = created.id;
    }
  } catch (error) {
    if (goal.autoAccept) await releaseSeat(goalId);
    // Two taps on the button racing each other: the unique index lets exactly one row through.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(
        409,
        'ALREADY_PENDING',
        'You have already asked to join. The poster has not decided yet.',
      );
    }
    throw error;
  }

  return respond(viewerId, requestId);
}

export async function listRequestsForGoal(viewerId: string, goalId: string) {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) throw AppError.notFound('That goal does not exist or has been removed');
  // Who asked to join is the poster's business alone. Requesters never see one another.
  if (goal.posterId !== viewerId) {
    throw AppError.forbidden('Only the poster can see who asked to join');
  }

  const requests = await prisma.joinRequest.findMany({
    where: { goalId, status: { in: [REQUEST_STATUS.PENDING, REQUEST_STATUS.ACCEPTED] } },
    include: { requester: true },
    orderBy: { createdAt: 'asc' },
  });
  return { requests: requests.map(toJoinRequestDTO) };
}

export async function decideRequest(
  viewerId: string,
  requestId: string,
  action: 'accept' | 'reject',
) {
  const request = await prisma.joinRequest.findUnique({
    where: { id: requestId },
    include: { goal: true },
  });
  // Anyone but the poster gets the same answer as a request that does not exist. Answering
  // "forbidden" would confirm to them that this student had asked to join that goal.
  if (!request || request.goal.posterId !== viewerId) {
    throw AppError.notFound('That request does not exist');
  }
  if (!nextStatus(request.status, action)) throw invalidTransition(request.status, action);

  if (action === 'reject') {
    await moveRequest(request.id, request.status, 'reject');
    return respond(viewerId, request.id);
  }

  const { goal } = request;
  if (goal.status !== GOAL_STATUS.OPEN && goal.status !== GOAL_STATUS.FULL) {
    throw new AppError(409, 'NOT_OPEN', 'This goal is no longer taking requests.');
  }
  if (goal.expiresAt && goal.expiresAt.getTime() <= Date.now()) {
    throw new AppError(409, 'EXPIRED', 'This goal has already happened.');
  }

  await claimSeat(goal.id);
  try {
    await moveRequest(request.id, request.status, 'accept');
  } catch (error) {
    // The student withdrew in the instant between the two writes: hand the spot back.
    await releaseSeat(goal.id);
    throw error;
  }
  return respond(viewerId, request.id);
}

export async function withdrawRequest(viewerId: string, requestId: string) {
  const request = await prisma.joinRequest.findUnique({
    where: { id: requestId },
    include: { goal: true },
  });
  if (!request || request.requesterId !== viewerId) {
    throw AppError.notFound('That request does not exist');
  }

  // You can pull out of something that has not happened yet; you cannot un-attend one that has.
  // Without this, leaving a completed goal would decrement its member count after the completion
  // had already been counted for everyone — rewriting a record of who actually turned up.
  if (
    request.goal.status === GOAL_STATUS.COMPLETED ||
    request.goal.status === GOAL_STATUS.ARCHIVED
  ) {
    throw new AppError(409, 'NOT_OPEN', 'This goal has already finished.');
  }

  await moveRequest(request.id, request.status, 'withdraw');
  // Only once the status move has succeeded, so a double tap cannot give one spot back twice.
  if (request.status === REQUEST_STATUS.ACCEPTED) await releaseSeat(request.goalId);
  return respond(viewerId, request.id);
}
