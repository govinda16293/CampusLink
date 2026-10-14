import type { z } from 'zod';
import {
  AUDIT_ACTION,
  REPORT_STATUS,
  GOAL_CATEGORY_LABEL,
  type reviewReportSchema,
} from '@campuslink/shared';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../lib/AppError.js';
import { toPublicUserDTO } from '../../serializers/user.serializer.js';

type ReviewInput = z.infer<typeof reviewReportSchema>;

/**
 * The moderator's side of the trust layer.
 *
 * Two things here are load-bearing for the promise the rest of the app makes to students:
 *
 *   1. **Unmasking is a separate, deliberate act.** The report queue does not show who is behind
 *      an anonymous goal. An admin has to ask, and asking is what writes the audit entry — so
 *      there is no way to see an identity as a side effect of doing ordinary moderation.
 *   2. **The audit log is append-only.** Nothing in this file, or anywhere else in the codebase,
 *      updates or deletes an AuditLog row, and no endpoint exposes one that could. Anonymous
 *      posting is a promise; the only thing that keeps such a promise honest is that breaking it
 *      leaves a mark the person who broke it cannot rub out.
 */

/** Writes the permanent record. Called by every action that needs one, before it answers. */
async function recordAudit(
  actorId: string,
  action: string,
  target: { type: string; id: string },
  detail: string,
) {
  await prisma.auditLog.create({
    data: { actorId, action, targetType: target.type, targetId: target.id, detail },
  });
}

/**
 * The report queue.
 *
 * The subject travels as an id and a reliability score, not a name — moderation work does not
 * need one, and an admin who wants it must unmask deliberately. The reporter is named, because an
 * admin judging whether a complaint is in good faith has to know whether it is the same student
 * filing all of them.
 */
export async function listReports(status?: string) {
  const reports = await prisma.report.findMany({
    where: status ? { status } : {},
    include: { reporter: true, subject: true, goal: true },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  });

  // How many open reports each of these students already has, so a pattern is visible without
  // opening every row. One query, not one per report.
  const counts = await prisma.report.groupBy({
    by: ['subjectId'],
    where: { subjectId: { in: reports.map((report) => report.subjectId) } },
    _count: { _all: true },
  });
  const totalBySubject = new Map(counts.map((row) => [row.subjectId, row._count._all]));

  return {
    reports: reports.map((report) => ({
      id: report.id,
      reason: report.reason,
      detail: report.detail,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
      reviewedAt: report.reviewedAt?.toISOString() ?? null,
      reporter: toPublicUserDTO(report.reporter),
      subject: {
        id: report.subject.id,
        reliabilityScore: report.subject.reliabilityScore,
        noShowCount: report.subject.noShowCount,
        /** Total reports ever filed about this student, so repeat offenders stand out. */
        reportsAgainst: totalBySubject.get(report.subjectId) ?? 0,
        /**
         * Whether seeing their name needs an unmask. A named subject is already public — they
         * posted under their own name — so there is nothing to reveal and nothing to log.
         */
        isAnonymous: report.goal?.anonymous === true,
        name: report.goal?.anonymous === true ? null : report.subject.name,
      },
      goal: report.goal
        ? {
            id: report.goal.id,
            title: report.goal.title,
            category:
              (GOAL_CATEGORY_LABEL as Record<string, string>)[report.goal.category] ??
              report.goal.category,
            anonymous: report.goal.anonymous,
          }
        : null,
      messageId: report.messageId,
    })),
  };
}

/**
 * Reveals who is behind an anonymous post, and writes that down forever.
 *
 * The audit row is created **before** the identity is returned. If the write fails, the admin
 * does not get the name — which is the right way round: a log that can be skipped by a failure is
 * not a log, and the whole value of this feature is that it cannot be used quietly.
 */
export async function unmaskReportSubject(adminId: string, reportId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { subject: true, goal: true },
  });
  if (!report) throw AppError.notFound('That report does not exist');

  await recordAudit(
    adminId,
    AUDIT_ACTION.UNMASK_POSTER,
    { type: 'Report', id: report.id },
    `Revealed ${report.subject.email} as the student behind report ${report.id}` +
      (report.goal ? ` (goal "${report.goal.title}")` : ''),
  );

  return {
    subject: {
      ...toPublicUserDTO(report.subject),
      // The one place in the codebase where an email leaves the server for somebody else's eyes.
      // It is what makes a moderator able to act at all — a name alone cannot be followed up by
      // the college — and it is exactly why the line above exists.
      email: report.subject.email,
    },
  };
}

export async function reviewReport(adminId: string, reportId: string, input: ReviewInput) {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw AppError.notFound('That report does not exist');
  if (report.status !== REPORT_STATUS.OPEN) {
    throw AppError.conflict('That report has already been dealt with');
  }

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: input.status,
      reviewedAt: new Date(),
      reviewedById: adminId,
      detail: input.note ? `${report.detail}\n\n[moderator] ${input.note}`.trim() : report.detail,
    },
  });

  await recordAudit(
    adminId,
    AUDIT_ACTION.REVIEW_REPORT,
    { type: 'Report', id: reportId },
    `Marked ${input.status.toLowerCase()}${input.note ? `: ${input.note}` : ''}`,
  );

  return { report: { id: updated.id, status: updated.status } };
}

/** The audit trail. Readable by admins, writable by nobody. */
export async function listAuditLog() {
  const entries = await prisma.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return {
    entries: entries.map((entry) => ({
      id: entry.id,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      detail: entry.detail,
      createdAt: entry.createdAt.toISOString(),
      actor: { id: entry.actor.id, name: entry.actor.name },
    })),
  };
}
