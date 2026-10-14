import type { z } from 'zod';
import { GOAL_STATUS, REQUEST_STATUS, type submitRatingsSchema } from '@campuslink/shared';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../lib/AppError.js';
import { isAbsentByVote, reliabilityScore } from '../../domain/reliability.js';
import { toPublicUserDTO } from '../../serializers/user.serializer.js';

type SubmitRatingsInput = z.infer<typeof submitRatingsSchema>;

/**
 * Ratings, and the reliability score they feed.
 *
 * The rule that shapes this whole file: **reliability is recomputed from scratch, never nudged.**
 * A goal's verdict about one person can flip as the rest of the group answers — two votes for
 * absent become a minority the moment two more people say present — so a counter incremented at
 * the time of each rating would drift away from the ratings behind it, and nothing would ever
 * catch it. `recomputeReliability` derives all three counters from the rows every time, which
 * makes it idempotent and makes a bug self-correcting on the next rating.
 */

/** Everyone who was in a lobby: the poster, plus whoever was accepted and stayed. */
async function memberIdsOf(goalId: string, posterId: string): Promise<Set<string>> {
  const accepted = await prisma.joinRequest.findMany({
    where: { goalId, status: REQUEST_STATUS.ACCEPTED },
    select: { requesterId: true },
  });
  return new Set([posterId, ...accepted.map((request) => request.requesterId)]);
}

/**
 * Rebuilds one student's trust counters from every rating ever recorded about them.
 *
 * Runs when a goal completes and after every rating submission. Three queries regardless of how
 * much history a student has, and the result does not depend on the order things happened in.
 */
export async function recomputeReliability(userId: string): Promise<void> {
  // Goals that finished with this student in them — posted by them, or joined and not left.
  const [posted, joined] = await Promise.all([
    prisma.goal.findMany({
      where: { posterId: userId, status: GOAL_STATUS.COMPLETED },
      select: { id: true },
    }),
    prisma.joinRequest.findMany({
      where: {
        requesterId: userId,
        status: REQUEST_STATUS.ACCEPTED,
        goal: { status: GOAL_STATUS.COMPLETED },
      },
      select: { goalId: true },
    }),
  ]);

  const commitments = new Set([
    ...posted.map((goal) => goal.id),
    ...joined.map((request) => request.goalId),
  ]);

  if (commitments.size === 0) {
    // No finished goals: back to the default rather than whatever was there before, so cancelling
    // or leaving everything cannot strand an old score on an account.
    await prisma.user.update({
      where: { id: userId },
      data: {
        goalsCompleted: 0,
        noShowCount: 0,
        reliabilityScore: reliabilityScore({ attended: 0, noShows: 0 }),
      },
    });
    return;
  }

  const votes = await prisma.rating.groupBy({
    by: ['goalId', 'attended'],
    where: { subjectId: userId, goalId: { in: [...commitments] } },
    _count: { _all: true },
  });

  const tally = new Map<string, { absentVotes: number; presentVotes: number }>();
  for (const goalId of commitments) tally.set(goalId, { absentVotes: 0, presentVotes: 0 });
  for (const row of votes) {
    const entry = tally.get(row.goalId);
    if (!entry) continue;
    if (row.attended) entry.presentVotes += row._count._all;
    else entry.absentVotes += row._count._all;
  }

  // A goal nobody answered about counts as attended. Silence is not an accusation, and most
  // goals will never be rated at all — treating those as absences would punish everyone.
  let noShows = 0;
  for (const entry of tally.values()) {
    if (isAbsentByVote(entry)) noShows += 1;
  }
  const attended = commitments.size - noShows;

  await prisma.user.update({
    where: { id: userId },
    data: {
      goalsCompleted: attended,
      noShowCount: noShows,
      reliabilityScore: reliabilityScore({ attended, noShows }),
    },
  });
}

/** Recomputes a whole lobby at once, for when a goal completes. */
export async function recomputeLobbyReliability(goalId: string, posterId: string): Promise<void> {
  const members = await memberIdsOf(goalId, posterId);
  for (const member of members) await recomputeReliability(member);
}

/**
 * What this student still has to answer about a finished goal, and what they already said.
 *
 * Refused to anyone outside the lobby with a 404, exactly as the roster and the chat are.
 */
export async function ratingSummary(viewerId: string, goalId: string) {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) throw AppError.notFound('That goal does not exist or has been removed');

  const members = await memberIdsOf(goalId, goal.posterId);
  if (!members.has(viewerId)) {
    throw AppError.notFound('That goal does not exist or has been removed');
  }

  const [already, people] = await Promise.all([
    prisma.rating.findMany({
      where: { goalId, raterId: viewerId },
      select: { subjectId: true, attended: true },
    }),
    prisma.user.findMany({ where: { id: { in: [...members].filter((id) => id !== viewerId) } } }),
  ]);

  const answered = new Map(already.map((rating) => [rating.subjectId, rating.attended]));

  return {
    // Only a finished goal can be rated — there is nothing to say about a plan.
    canRate: goal.status === GOAL_STATUS.COMPLETED,
    goalStatus: goal.status,
    people: people.map((person) => ({
      ...toPublicUserDTO(person),
      /** True, false, or null when this student has not answered about them yet. */
      attended: answered.get(person.id) ?? null,
    })),
  };
}

export async function submitRatings(
  viewerId: string,
  goalId: string,
  input: SubmitRatingsInput,
): Promise<ReturnType<typeof ratingSummary>> {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) throw AppError.notFound('That goal does not exist or has been removed');

  const members = await memberIdsOf(goalId, goal.posterId);
  if (!members.has(viewerId)) {
    throw AppError.notFound('That goal does not exist or has been removed');
  }

  // Only once it has actually happened. Rating a plan is rating something nobody has seen.
  if (goal.status !== GOAL_STATUS.COMPLETED) {
    throw new AppError(409, 'NOT_COMPLETED', 'You can answer this once the goal is marked done.');
  }

  const subjectIds = input.ratings.map((rating) => rating.subjectId);
  if (new Set(subjectIds).size !== subjectIds.length) {
    throw AppError.badRequest('You have answered about the same person twice');
  }
  for (const subjectId of subjectIds) {
    if (subjectId === viewerId) {
      throw AppError.badRequest('You cannot answer about yourself');
    }
    if (!members.has(subjectId)) {
      throw AppError.badRequest('That person was not in this goal');
    }
  }

  // `createMany` with no skipDuplicates: answering twice about the same person is a conflict the
  // student should be told about, not something to silently drop. A rating is never edited, so a
  // second answer would otherwise quietly contradict the first.
  const existing = await prisma.rating.findMany({
    where: { goalId, raterId: viewerId, subjectId: { in: subjectIds } },
    select: { subjectId: true },
  });
  if (existing.length > 0) {
    throw AppError.conflict('You have already answered about one of these people');
  }

  await prisma.rating.createMany({
    data: input.ratings.map((rating) => ({
      goalId,
      raterId: viewerId,
      subjectId: rating.subjectId,
      attended: rating.attended,
    })),
  });

  // Everyone just rated, because a new vote can flip a verdict either way.
  for (const subjectId of subjectIds) await recomputeReliability(subjectId);

  return ratingSummary(viewerId, goalId);
}
