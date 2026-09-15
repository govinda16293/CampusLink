import type { JoinRequest, User } from '@prisma/client';
import { toPublicUserDTO } from './user.serializer.js';

type JoinRequestWithRequester = JoinRequest & { requester: User };

/**
 * A join request as the poster, or the student who made it, may see it.
 *
 * The requester travels as a public profile: name, photograph, branch, year and reliability —
 * exactly what deciding needs, and nothing that would let a poster contact them off the platform.
 * The email never leaves the server here, because `toPublicUserDTO` does not carry one.
 */
export function toJoinRequestDTO(request: JoinRequestWithRequester) {
  return {
    id: request.id,
    goalId: request.goalId,
    status: request.status,
    message: request.message,
    createdAt: request.createdAt.toISOString(),
    decidedAt: request.decidedAt?.toISOString() ?? null,
    requester: toPublicUserDTO(request.requester),
  };
}
