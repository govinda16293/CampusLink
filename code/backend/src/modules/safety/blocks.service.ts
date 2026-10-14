import { prisma } from '../../db/prisma.js';
import { AppError } from '../../lib/AppError.js';
import { toPublicUserDTO } from '../../serializers/user.serializer.js';

/**
 * Blocking.
 *
 * Stored one way — who blocked whom — and **enforced both ways**. That asymmetry is the whole
 * subtlety of this file. If a block were read only in the direction it was made, the person who
 * was blocked would still see the blocker's goals on the feed and could still ask to join them,
 * which is precisely the thing somebody blocks another student to stop. So every read asks "is
 * there a block in either direction between these two", and the answer hides them from each other
 * symmetrically.
 *
 * What blocking does **not** do is dissolve a group the two are already in. Quietly removing
 * somebody from a lobby they had committed to, and from a chat other people are relying on, is a
 * bigger and more surprising act than the student asked for — so an existing lobby survives, and
 * the UI says so. Leaving is a separate, deliberate choice.
 */

/**
 * Every user id this viewer should not see, and who should not see them.
 *
 * One query, returning a set the callers can filter with. Loaded per request rather than cached:
 * a student who has just blocked somebody expects them gone on the next screen, not on the next
 * login.
 */
export async function blockedUserIds(viewerId: string): Promise<Set<string>> {
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    select: { blockerId: true, blockedId: true },
  });

  const ids = new Set<string>();
  for (const block of blocks) {
    ids.add(block.blockerId === viewerId ? block.blockedId : block.blockerId);
  }
  return ids;
}

/** Whether these two students are hidden from each other, in either direction. */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const found = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  return found !== null;
}

export async function blockUser(viewerId: string, targetId: string) {
  if (viewerId === targetId) {
    throw AppError.badRequest('You cannot block yourself');
  }
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw AppError.notFound('That student does not exist');

  // Blocking twice is what a double tap looks like, not an error worth showing anybody.
  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: viewerId, blockedId: targetId } },
    create: { blockerId: viewerId, blockedId: targetId },
    update: {},
  });

  return { blocked: toPublicUserDTO(target) };
}

export async function unblockUser(viewerId: string, targetId: string) {
  // deleteMany rather than delete: unblocking someone who was never blocked is not a failure, it
  // is simply already true.
  await prisma.block.deleteMany({
    where: { blockerId: viewerId, blockedId: targetId },
  });
  return { unblocked: targetId };
}

/**
 * The student's own list — only the blocks they made.
 *
 * Deliberately not the blocks made against them: telling somebody who has blocked them is an
 * invitation to go and find out why, which is the last thing a blocked-for-good-reason student
 * needs. They simply stop seeing each other.
 */
export async function listBlocks(viewerId: string) {
  const blocks = await prisma.block.findMany({
    where: { blockerId: viewerId },
    include: { blocked: true },
    orderBy: { createdAt: 'desc' },
  });

  return {
    blocks: blocks.map((block) => ({
      ...toPublicUserDTO(block.blocked),
      blockedAt: block.createdAt.toISOString(),
    })),
  };
}
