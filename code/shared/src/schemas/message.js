import { z } from 'zod';

/** Long enough to sort out a meeting place, short enough that nobody writes an essay. */
export const MESSAGE_MAX = 1000;

/**
 * Body for sending a message to a lobby.
 *
 * `.strict()` with one field, for the same reason as the join-request body: who sent a message
 * and when are decided by the server from the session, never by the client, so a body carrying
 * `senderId` is refused outright rather than silently ignored.
 *
 * Trimmed and non-empty, so a tap on "Send" with nothing typed — or with only spaces — is a
 * validation error rather than a blank bubble nobody can read or delete.
 */
export const sendMessageSchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(1, 'Type a message first')
      .max(MESSAGE_MAX, `Keep it under ${MESSAGE_MAX} characters`),
  })
  .strict();

/**
 * Query for reading a lobby's history.
 *
 * Paged backwards from the newest message, because that is where a chat is read from: opening a
 * conversation should cost one page whether it holds twenty messages or two thousand. `before` is
 * the id of the oldest message already on screen.
 */
export const messageQuerySchema = z.object({
  before: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});
