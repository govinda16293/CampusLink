import type { z } from 'zod';
import {
  GENDER,
  GOAL_STATUS,
  REQUEST_STATUS,
  UNDATED_GOAL_TTL_HOURS,
  MESSAGE_KIND,
  type createGoalSchema,
  type feedQuerySchema,
  type updateGoalSchema,
} from '@campuslink/shared';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../lib/AppError.js';
import { canViewLobby, nextGoalStatus, type GoalAction } from '../../domain/goal.js';
import { toGoalDTO, type GoalViewerContext } from '../../serializers/goal.serializer.js';
import { toLobbyDTO } from '../../serializers/lobby.serializer.js';
import { toMessageDTO } from '../../serializers/message.serializer.js';
import { publish } from '../../realtime/bus.js';
import { recomputeLobbyReliability } from '../ratings/ratings.service.js';
import { blockedUserIds } from '../safety/blocks.service.js';

type CreateGoalInput = z.infer<typeof createGoalSchema>;
type FeedQuery = z.infer<typeof feedQuerySchema>;
type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

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

  /*
   * Blocked students disappear from the feed in both directions.
   *
   * Applied to discovery only. "Joined" and "My goals" are lists of commitments already made, and
   * blocking somebody does not undo a group you are both in — hiding it would leave a student
   * unable to reach a lobby and a chat that other people are still relying on them for. The UI
   * tells them to leave if that is what they want.
   */
  if (query.mine !== 'true' && query.joined !== 'true') {
    const hidden = await blockedUserIds(viewerId);
    if (hidden.size > 0) where.posterId = { notIn: [...hidden] };
  }

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

/**
 * How a changed time is written into the lobby chat.
 *
 * Formatted on the server in the campus timezone rather than the viewer's, and written into the
 * message body as plain text at the moment it happens. A chat line is a record of what was said
 * then — re-deriving it per reader from a stored timestamp would let the same line read
 * differently to two people in the same group, which is the one thing a shared record must not do.
 */
const CAMPUS_TIME_ZONE = 'Asia/Kolkata';

function describeWhen(dateTime: Date | null): string {
  if (!dateTime) return 'no fixed time (whenever)';
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: CAMPUS_TIME_ZONE,
  }).format(dateTime);
}

/**
 * Edits a goal that is already posted.
 *
 * The reason this exists at all: without it, fixing a time meant cancelling and reposting, which
 * threw away the lobby and the whole conversation in it.
 *
 * The hard part is not the update, it is that **people have already agreed to something**. Three
 * rules follow from that, and each one exists because of a way this could quietly hurt somebody
 * who had already committed:
 *
 *   1. A changed time is announced in the group chat. Silently moving a goal people had joined
 *      is how somebody turns up at six for a thing that now starts at eight. They find out where
 *      they are already looking, and they can leave if it no longer suits.
 *   2. Headcount cannot drop below the people already accepted. There is no honest way to pick
 *      which of them stops being in.
 *   3. Anonymity cannot be switched on once anybody is in. They have already seen who the poster
 *      is, so hiding the name afterwards would tell new readers something untrue.
 */
export async function updateGoal(viewerId: string, goalId: string, input: UpdateGoalInput) {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) throw AppError.notFound('That goal does not exist');
  if (goal.posterId !== viewerId) throw AppError.forbidden('That is not your goal to edit');

  // A finished or abandoned goal is a record of what happened, not a draft.
  const editable: string[] = [GOAL_STATUS.OPEN, GOAL_STATUS.FULL, GOAL_STATUS.CLOSED];
  if (!editable.includes(goal.status)) {
    throw AppError.conflict(`A ${goal.status.toLowerCase()} goal cannot be edited.`);
  }

  if (input.headcount !== undefined && input.headcount < goal.acceptedCount) {
    throw AppError.badRequest(
      `${goal.acceptedCount} ${goal.acceptedCount === 1 ? 'person has' : 'people have'} already joined, so you cannot ask for fewer than that.`,
    );
  }

  if (input.anonymous === true && !goal.anonymous && goal.acceptedCount > 0) {
    throw AppError.badRequest(
      'People have already joined and seen who you are, so this cannot be made anonymous now.',
    );
  }

  const nextDateTime =
    input.dateTime === undefined ? goal.dateTime : input.dateTime ? new Date(input.dateTime) : null;
  const timeChanged = nextDateTime?.getTime() !== goal.dateTime?.getTime();

  // Capacity and the OPEN/FULL split are two views of one fact, so raising the headcount has to
  // reopen a goal that had filled, and lowering it onto the current count has to close it.
  const headcount = input.headcount ?? goal.headcount;
  let status = goal.status;
  if (goal.status === GOAL_STATUS.FULL && goal.acceptedCount < headcount) {
    status = GOAL_STATUS.OPEN;
  } else if (goal.status === GOAL_STATUS.OPEN && goal.acceptedCount >= headcount) {
    status = GOAL_STATUS.FULL;
  }

  const updated = await prisma.goal.update({
    where: { id: goalId },
    data: {
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.genderPreference !== undefined ? { genderPreference: input.genderPreference } : {}),
      ...(input.autoAccept !== undefined ? { autoAccept: input.autoAccept } : {}),
      ...(input.anonymous !== undefined ? { anonymous: input.anonymous } : {}),
      headcount,
      status,
      dateTime: nextDateTime,
      // The expiry follows the time, or falls back to the 48-hour window for a whenever goal.
      ...(timeChanged ? { expiresAt: expiryFor(nextDateTime) } : {}),
    },
    include: { poster: true },
  });

  // Only worth saying when there is somebody to say it to.
  if (timeChanged && goal.acceptedCount > 0) {
    const message = await prisma.message.create({
      data: {
        goalId,
        senderId: viewerId,
        kind: MESSAGE_KIND.SYSTEM,
        body: `The time changed to ${describeWhen(nextDateTime)}.`,
      },
      include: { sender: true },
    });
    publish(goalId, 'message:new', { message: toMessageDTO(message) });
  }

  const contextFor = await viewerContextFor(viewerId, [goalId]);
  return toGoalDTO(updated, contextFor(goalId));
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
    // Recomputed from the ratings rather than incremented, which is what Step 9 replaced here.
    // A verdict about one person can flip as the rest of the group answers, so a counter nudged
    // up at completion and nudged again on each rating would drift out of agreement with the rows
    // behind it. Deriving all three counters every time makes this idempotent — which also means
    // the compare-and-set above is the only thing standing between a double completion and a
    // double count, and it no longer has to be.
    await recomputeLobbyReliability(goalId, goal.posterId);
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
