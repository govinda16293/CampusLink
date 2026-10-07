import type { z } from 'zod';
import {
  GENDER,
  GOAL_STATUS,
  REQUEST_STATUS,
  UNDATED_GOAL_TTL_HOURS,
  type createGoalSchema,
  type feedQuerySchema,
} from '@campuslink/shared';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../lib/AppError.js';
import { canViewLobby, nextGoalStatus, type GoalAction } from '../../domain/goal.js';
import { toGoalDTO, type GoalViewerContext } from '../../serializers/goal.serializer.js';
import { toLobbyDTO } from '../../serializers/lobby.serializer.js';

type CreateGoalInput = z.infer<typeof createGoalSchema>;
type FeedQuery = z.infer<typeof feedQuerySchema>;

/**
 * When a goal stops accepting requests.
 *
 * Dated goals expire when they happen. Undated ones get the proposal's 48-hour window, so the
 * feed does not fill with stale "whenever" posts nobody will ever fulfil.
 */
function expiryFor(dateTime: Date | null): Date {
  if (dateTime) return dateTime;
  return new Date(Date.now() + UNDATED_GOAL_TTL_HOURS * 60 * 60 * 1000);
}

/**
 * What the serializer needs to know about the person looking, for any number of goals.
 *
 * Three queries whatever the page size: the viewer's gender once, their own requests on exactly
 * these goals in a single IN lookup, and one grouped count of who is waiting on their decision.
 * Resolving any of it per card would turn a feed of twenty goals into sixty queries. Returns a
 * lookup function rather than a map, so no caller can forget a default.
 */
export async function viewerContextFor(viewerId: string, goalIds: string[]) {
  const [viewer, requests, pending] = await Promise.all([
    prisma.user.findUnique({ where: { id: viewerId }, select: { gender: true } }),
    goalIds.length > 0
      ? prisma.joinRequest.findMany({
          where: { requesterId: viewerId, goalId: { in: goalIds } },
          select: { id: true, goalId: true, status: true },
        })
      : Promise.resolve([]),
    // Scoped to goals this viewer posted, not merely to the ids on the page: the count is only
    // ever shown on your own goals, and a query that could not produce anybody else's number is
    // a stronger guarantee than a serializer that remembers not to print it.
    goalIds.length > 0
      ? prisma.joinRequest.groupBy({
          by: ['goalId'],
          where: {
            goalId: { in: goalIds },
            status: REQUEST_STATUS.PENDING,
            goal: { posterId: viewerId },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  const requestByGoal = new Map(
    requests.map((request) => [request.goalId, { id: request.id, status: request.status }]),
  );
  const pendingByGoal = new Map(pending.map((row) => [row.goalId, row._count._all]));
  const viewerGender = viewer?.gender ?? GENDER.UNDISCLOSED;

  return (goalId: string): GoalViewerContext => ({
    viewerId,
    viewerGender,
    viewerRequest: requestByGoal.get(goalId) ?? null,
    pendingRequestCount: pendingByGoal.get(goalId) ?? 0,
  });
}

export async function createGoal(posterId: string, input: CreateGoalInput) {
  const dateTime = input.dateTime ? new Date(input.dateTime) : null;

  const goal = await prisma.goal.create({
    data: {
      posterId,
      category: input.category,
      title: input.title,
      description: input.description,
      dateTime,
      headcount: input.headcount,
      anonymous: input.anonymous,
      genderPreference: input.genderPreference,
      autoAccept: input.autoAccept,
      expiresAt: expiryFor(dateTime),
      status: GOAL_STATUS.OPEN,
    },
    include: { poster: true },
  });

  // No lookups needed: it is the poster's own goal, and nobody can have asked to join it yet.
  return toGoalDTO(goal, {
    viewerId: posterId,
    viewerGender: goal.poster.gender,
    viewerRequest: null,
  });
}

/**
 * The three lists the feed can show, and how they differ.
 *
 * Each is a genuinely different question, which is why they are spelled out here rather than
 * expressed as flags on one query that would be read wrongly by everybody who came after:
 *
 *   discover — goals you could still join. OPEN only, and not yet expired.
 *   mine     — goals you posted. Keeps the ones that filled and the ones you confirmed: they are
 *              no longer on offer, but they are still very much yours to manage.
 *   joined   — goals you were accepted onto. Keeps them past their time, because a commitment
 *              that happened an hour ago is exactly the one you open to see who was there, and
 *              the poster still has to mark it done.
 */
function feedFilter(viewerId: string, query: FeedQuery, now: Date): Record<string, unknown> {
  if (query.joined === 'true') {
    return {
      requests: { some: { requesterId: viewerId, status: REQUEST_STATUS.ACCEPTED } },
      status: {
        in: [GOAL_STATUS.OPEN, GOAL_STATUS.FULL, GOAL_STATUS.CLOSED, GOAL_STATUS.COMPLETED],
      },
    };
  }

  if (query.mine === 'true') {
    return {
      posterId: viewerId,
      status: { in: [GOAL_STATUS.OPEN, GOAL_STATUS.FULL, GOAL_STATUS.CLOSED] },
      expiresAt: { gt: now },
    };
  }

  return {
    status: GOAL_STATUS.OPEN,
    // Undated goals carry a 48-hour expiry, dated ones expire when they happen.
    expiresAt: { gt: now },
  };
}

/**
 * The public campus feed.
 *
 * Newest first, cursor-paginated, filterable by category and date. Expired goals are excluded at
 * query time rather than swept by a job — the sweep in Step 11 marks them ARCHIVED for the
 * metrics, but the feed must never show a goal whose time has passed even before that job runs.
 */
export async function listGoals(viewerId: string, query: FeedQuery) {
  const now = new Date();

  const where: Record<string, unknown> = feedFilter(viewerId, query, now);

  if (query.category) where.category = query.category;

  if (query.from || query.to) {
    const range: Record<string, Date> = {};
    if (query.from) range.gte = new Date(`${query.from}T00:00:00.000Z`);
    // `to` is inclusive of the whole day, which is what a date picker implies.
    if (query.to) range.lte = new Date(`${query.to}T23:59:59.999Z`);
    where.dateTime = range;
  }

  const goals = await prisma.goal.findMany({
    where,
    include: { poster: true },
    orderBy: { createdAt: 'desc' },
    // One extra row tells us whether another page exists, without a second count query.
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });

  const hasMore = goals.length > query.limit;
  const page = hasMore ? goals.slice(0, query.limit) : goals;

  const contextFor = await viewerContextFor(
    viewerId,
    page.map((goal) => goal.id),
  );

  return {
    goals: page.map((goal) => toGoalDTO(goal, contextFor(goal.id))),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
}

export async function getGoal(viewerId: string, goalId: string) {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: { poster: true },
  });

  if (!goal) throw AppError.notFound('That goal does not exist or has been removed');

  const contextFor = await viewerContextFor(viewerId, [goal.id]);
  return toGoalDTO(goal, contextFor(goal.id));
}

/**
 * Moves a goal to a new status, or fails if somebody moved it first.
 *
 * A compare-and-set on the status that was read, for the same reason as the request machine in
 * Step 4: it is built from a single statement, so two taps on "Mark as done" cannot both land and
 * double-count a completion. Built this way rather than as an interactive transaction so it is
 * correct on PostgreSQL, whose default isolation would let a read-then-write race, and not merely
 * on SQLite, which happens to serialise writes.
 *
 * Exported so the stale read can be tested directly. Driving it through two HTTP requests cannot
 * reach it: `transitionGoal` checks the move is legal before writing, so a second sequential
 * "mark as done" is already refused by the state machine, and against SQLite two simultaneous
 * requests execute one after the other anyway. A test built on either passed with this guard
 * deleted — the same trap the Step 4 seat count fell into.
 */
export async function moveGoal(goalId: string, from: string, to: string) {
  const { count } = await prisma.goal.updateMany({
    where: { id: goalId, status: from },
    data: { status: to },
  });
  if (count === 0) {
    throw AppError.conflict('This goal changed a moment ago. Refresh and try again.');
  }
}

const PAST_TENSE: Record<GoalAction, string> = {
  close: 'confirmed',
  complete: 'marked as done',
  reopen: 'reopened',
  cancel: 'cancelled',
};

/**
 * Every change a poster can make to their goal's lifecycle, in one place.
 *
 * Close, complete, reopen and cancel differ only in which transition they ask for and what has to
 * happen alongside it, so they share one function: the permission check, the legality check and
 * the compare-and-set are written once and cannot drift between four near-identical copies.
 *
 * The row is never deleted, whatever the ending. The fulfilment-rate metric in Step 11 needs to
 * know a goal existed and how it finished, and a lobby that formed should not lose its history.
 */
async function transitionGoal(viewerId: string, goalId: string, action: GoalAction) {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) throw AppError.notFound('That goal does not exist');
  if (goal.posterId !== viewerId) throw AppError.forbidden('That is not your goal to manage');

  const to = nextGoalStatus(goal.status, action);
  if (!to) {
    throw AppError.conflict(`A ${goal.status.toLowerCase()} goal cannot be ${PAST_TENSE[action]}.`);
  }

  // Reopening lands on FULL rather than OPEN when every spot is still taken. The state machine
  // names the general case; only the service knows how many people are actually in.
  const settled =
    action === 'reopen' && goal.acceptedCount >= goal.headcount ? GOAL_STATUS.FULL : to;

  await moveGoal(goalId, goal.status, settled);

  if (action === 'close') {
    // Confirming the group answers everyone still waiting. Leaving them PENDING against a goal
    // that no longer takes requests would be a request nobody can ever resolve — the student
    // would see "waiting for a decision" forever on something that had already gone ahead.
    await prisma.joinRequest.updateMany({
      where: { goalId, status: REQUEST_STATUS.PENDING },
      data: { status: REQUEST_STATUS.REJECTED, decidedAt: new Date() },
    });
  }

  if (action === 'complete') {
    // One goal completed each, for the poster and everyone who turned up. Safe to do outside the
    // compare-and-set because COMPLETED is terminal and the CAS above let exactly one caller
    // through, so this runs once per goal for all time. Step 9 turns these counts into the
    // reliability score; until then they are simply an honest tally.
    const members = await prisma.joinRequest.findMany({
      where: { goalId, status: REQUEST_STATUS.ACCEPTED },
      select: { requesterId: true },
    });
    await prisma.user.updateMany({
      where: { id: { in: [goal.posterId, ...members.map((m) => m.requesterId)] } },
      data: { goalsCompleted: { increment: 1 } },
    });
  }

  const updated = await prisma.goal.findUniqueOrThrow({
    where: { id: goalId },
    include: { poster: true },
  });
  const contextFor = await viewerContextFor(viewerId, [goalId]);
  return toGoalDTO(updated, contextFor(goalId));
}

/** Locks the group in: no more requests, and whoever is in is who is going. */
export const closeGoal = (viewerId: string, goalId: string) =>
  transitionGoal(viewerId, goalId, 'close');

/** It happened. Terminal, and the one transition that feeds the fulfilment metric. */
export const completeGoal = (viewerId: string, goalId: string) =>
  transitionGoal(viewerId, goalId, 'complete');

/** Changed your mind before it happened: back on the feed, taking requests again. */
export const reopenGoal = (viewerId: string, goalId: string) =>
  transitionGoal(viewerId, goalId, 'reopen');

export const cancelGoal = (viewerId: string, goalId: string) =>
  transitionGoal(viewerId, goalId, 'cancel');

/**
 * Who is in the lobby.
 *
 * Refused to anyone who is not the poster or an accepted member, with a 404 rather than a 403:
 * "you are not allowed to see this lobby" would confirm to a stranger that a particular goal has
 * a group, which is one bit more than they are owed. The roster is the one screen that shows real
 * names to people who may not know each other, so the door is the strictest in the app.
 */
export async function getLobby(viewerId: string, goalId: string) {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: { poster: true },
  });
  if (!goal) throw AppError.notFound('That goal does not exist or has been removed');

  const viewerRequest = await prisma.joinRequest.findUnique({
    where: { goalId_requesterId: { goalId, requesterId: viewerId } },
    select: { status: true },
  });

  const allowed = canViewLobby({
    posterId: goal.posterId,
    viewerId,
    viewerRequestStatus: viewerRequest?.status ?? null,
  });
  if (!allowed) throw AppError.notFound('That goal does not exist or has been removed');

  const members = await prisma.joinRequest.findMany({
    where: { goalId, status: REQUEST_STATUS.ACCEPTED },
    include: { requester: true },
    orderBy: { decidedAt: 'asc' },
  });

  return { lobby: toLobbyDTO(goal, members) };
}
