import type { z } from 'zod';
import {
  GOAL_STATUS,
  REQUEST_STATUS,
  type messageQuerySchema,
  type sendMessageSchema,
} from '@campuslink/shared';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../lib/AppError.js';
import { canViewLobby } from '../../domain/goal.js';
import { publish } from '../../realtime/bus.js';
import { toMessageDTO } from '../../serializers/message.serializer.js';

type SendMessageInput = z.infer<typeof sendMessageSchema>;
type MessageQuery = z.infer<typeof messageQuerySchema>;

/**
 * The lobby's group chat.
 *
 * Everything here hangs off one function — `assertLobbyAccess`. It is the only place that decides
 * who may touch a conversation, and the HTTP reads, the HTTP writes and the socket join all call
 * it rather than each re-deriving the rule. A second copy of this check is how a chat ends up
 * readable by someone who was declined.
 */

/** A group that has been called off is closed for writing; one that happened is not. */
const WRITABLE_GOAL_STATUSES: string[] = [
  GOAL_STATUS.OPEN,
  GOAL_STATUS.FULL,
  GOAL_STATUS.CLOSED,
  // Still open after the fact, so a group can say thanks or sort out who is bringing what back.
  GOAL_STATUS.COMPLETED,
];

/**
 * Confirms this viewer is in this lobby, and hands back the goal.
 *
 * Refused with a 404 rather than a 403, exactly as the roster is: "you may not read this chat"
 * would confirm to a stranger holding a goal id that a conversation exists on it. Asked fresh
 * every time rather than cached on the session, so leaving a group takes effect immediately.
 */
export async function assertLobbyAccess(viewerId: string, goalId: string) {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
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

  return goal;
}

/**
 * One page of history, newest first.
 *
 * Paged backwards from the newest message because that is where a chat is read from: opening a
 * conversation costs one page whether it holds twenty messages or two thousand. The client
 * reverses the page for display; doing it here would make "the next page" mean two different
 * things in two places.
 */
export async function listMessages(viewerId: string, goalId: string, query: MessageQuery) {
  await assertLobbyAccess(viewerId, goalId);

  const messages = await prisma.message.findMany({
    where: { goalId },
    include: { sender: true },
    orderBy: { createdAt: 'desc' },
    // One extra row tells us whether an older page exists, without a second count query.
    take: query.limit + 1,
    ...(query.before ? { cursor: { id: query.before }, skip: 1 } : {}),
  });

  const hasMore = messages.length > query.limit;
  const page = hasMore ? messages.slice(0, query.limit) : messages;

  return {
    messages: page.map(toMessageDTO),
    nextBefore: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
}

export async function sendMessage(viewerId: string, goalId: string, input: SendMessageInput) {
  const goal = await assertLobbyAccess(viewerId, goalId);

  if (!WRITABLE_GOAL_STATUSES.includes(goal.status)) {
    throw new AppError(409, 'NOT_OPEN', 'This goal was called off, so its chat is closed.');
  }

  const message = await prisma.message.create({
    data: { goalId, senderId: viewerId, body: input.body },
    include: { sender: true },
  });
  const dto = toMessageDTO(message);

  // Saved first, announced second. A socket that is down, or absent entirely, costs the sender a
  // live update and nothing else — the message is already in the history everyone will load next.
  publish(goalId, 'message:new', { message: dto });

  return { message: dto };
}

/** Everyone who may currently read a lobby: the poster, plus whoever was accepted. */
export async function lobbyMemberIds(goalId: string): Promise<string[]> {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: { posterId: true },
  });
  if (!goal) return [];

  const accepted = await prisma.joinRequest.findMany({
    where: { goalId, status: REQUEST_STATUS.ACCEPTED },
    select: { requesterId: true },
  });
  return [goal.posterId, ...accepted.map((request) => request.requesterId)];
}
