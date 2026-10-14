import type { z } from 'zod';
import { REPORT_STATUS, type createReportSchema } from '@campuslink/shared';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../lib/AppError.js';
import { assertLobbyAccess } from '../messages/messages.service.js';

type CreateReportInput = z.infer<typeof createReportSchema>;

/**
 * Reports.
 *
 * A report names a **student**, never a post, even when it was filed from a goal. That is the
 * question an admin has to answer — is this person a problem — and it is the only framing that
 * works for an anonymous goal, where the reporter genuinely cannot know who they are reporting.
 * The server resolves the subject, and the reporter is never told who it turned out to be.
 *
 * Which is also why this module returns almost nothing. A report confirms it was received and
 * stops there: an outcome, a name, even a count would turn the report form into a way to probe
 * who is behind an anonymous post.
 */

/** Works out who is actually being reported, from whatever context the client supplied. */
async function resolveSubject(reporterId: string, input: CreateReportInput): Promise<string> {
  if (input.goalId) {
    const goal = await prisma.goal.findUnique({
      where: { id: input.goalId },
      select: { posterId: true },
    });
    if (!goal) throw AppError.notFound('That goal does not exist or has been removed');
    return goal.posterId;
  }

  if (input.messageId) {
    const message = await prisma.message.findUnique({
      where: { id: input.messageId },
      select: { senderId: true, goalId: true },
    });
    if (!message) throw AppError.notFound('That message does not exist');

    // Only somebody who can read the conversation may report something in it, or a message id
    // would be a way to file reports about chats you were never part of.
    await assertLobbyAccess(reporterId, message.goalId);
    return message.senderId;
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true },
  });
  if (!user) throw AppError.notFound('That student does not exist');
  return user.id;
}

export async function createReport(reporterId: string, input: CreateReportInput) {
  const subjectId = await resolveSubject(reporterId, input);

  if (subjectId === reporterId) {
    throw AppError.badRequest('You cannot report yourself');
  }

  // One open report per reporter per subject. A student may report somebody again once the first
  // has been dealt with, but cannot file the same complaint fifty times and bury the queue.
  const openAlready = await prisma.report.findFirst({
    where: { reporterId, subjectId, status: REPORT_STATUS.OPEN },
    select: { id: true },
  });
  if (openAlready) {
    throw AppError.conflict('You have already reported this. The team is looking at it.');
  }

  await prisma.report.create({
    data: {
      reporterId,
      subjectId,
      goalId: input.goalId ?? null,
      messageId: input.messageId ?? null,
      reason: input.reason,
      detail: input.detail,
    },
  });

  // Nothing about the subject comes back. Not their name, not how many reports they have, not
  // whether this is the first — a report form that answered any of those would be a lookup tool.
  return { received: true };
}
