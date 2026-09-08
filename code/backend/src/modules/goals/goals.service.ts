import type { z } from 'zod';
import {
  GOAL_STATUS,
  UNDATED_GOAL_TTL_HOURS,
  type createGoalSchema,
  type feedQuerySchema,
} from '@campuslink/shared';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../lib/AppError.js';
import { toGoalDTO } from '../../serializers/goal.serializer.js';

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

  return toGoalDTO(goal, { viewerId: posterId });
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

  const where: Record<string, unknown> = {
    status: GOAL_STATUS.OPEN,
    // Undated goals carry a 48-hour expiry, dated ones expire when they happen.
    expiresAt: { gt: now },
  };

  if (query.category) where.category = query.category;
  if (query.mine === 'true') where.posterId = viewerId;

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

  return {
    goals: page.map((goal) => toGoalDTO(goal, { viewerId })),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
}

export async function getGoal(viewerId: string, goalId: string) {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: { poster: true },
  });

  if (!goal) throw AppError.notFound('That goal does not exist or has been removed');

  return toGoalDTO(goal, { viewerId });
}

/**
 * Cancels a goal.
 *
 * The row is kept rather than deleted: the fulfilment-rate metric in Step 11 needs to know a goal
 * existed and how it ended, and a lobby that already formed should not lose its history.
 */
export async function cancelGoal(viewerId: string, goalId: string) {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });

  if (!goal) throw AppError.notFound('That goal does not exist');
  if (goal.posterId !== viewerId) throw AppError.forbidden('That is not your goal to cancel');
  if (goal.status !== GOAL_STATUS.OPEN) {
    throw AppError.conflict('That goal is no longer open');
  }

  const updated = await prisma.goal.update({
    where: { id: goalId },
    data: { status: GOAL_STATUS.CANCELLED },
    include: { poster: true },
  });

  return toGoalDTO(updated, { viewerId });
}
