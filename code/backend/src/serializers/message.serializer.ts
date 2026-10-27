import type { Message, User } from '@prisma/client';
import { toPublicUserDTO } from './user.serializer.js';

type MessageWithSender = Message & { sender: User };

/**
 * A chat message as the lobby sees it.
 *
 * The sender travels as a public profile — the same shape the roster uses, so a name and face in
 * the chat and a name and face in the member list are the same person by construction and cannot
 * drift apart. No email, here as everywhere: a group chat is not a way to collect addresses.
 *
 * Anonymous posting is not re-applied here and must not be. A goal's poster is anonymous only to
 * people who have not been accepted; everyone who can read this has been, and the lobby already
 * shows them the poster's name.
 */
export function toMessageDTO(message: MessageWithSender) {
  return {
    id: message.id,
    goalId: message.goalId,
    body: message.body,
    /** One of MESSAGE_KIND: a student typing, or the app reporting a change to the goal. */
    kind: message.kind,
    createdAt: message.createdAt.toISOString(),
    sender: toPublicUserDTO(message.sender),
  };
}
