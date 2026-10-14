/**
 * How a reliability score is worked out, as pure functions.
 *
 * The number on every feed card, every roster row and every chat bubble comes from here and
 * nowhere else, so what it means can be stated in one place and tested exhaustively.
 */

/**
 * Imaginary good turnouts every student starts with.
 *
 * Without it the first rating a student ever receives decides everything: one person marked
 * absent on their very first goal would read 0 out of 100, which is both unfair and useless —
 * a brand-new account and a serial no-show would be indistinguishable. With a prior of four, a
 * single absence costs a newcomer 20 points rather than all of them, and the score converges on
 * the truth as real history accumulates. It is the standard fix for a ratio over a tiny sample.
 */
export const RELIABILITY_PRIOR = 4;

/** Everyone starts here, and a student with no finished goals stays here. */
export const DEFAULT_RELIABILITY = 100;

/**
 * Whether a group's answers add up to "they did not turn up".
 *
 * A majority, never a single voice. One annoyed student should not be able to mark somebody
 * absent from a goal they attended — on a group of four that is one vote against two, and it
 * loses. A tie goes to the person being rated, because half the group saying you were there is
 * not evidence that you were not.
 */
export function isAbsentByVote({
  absentVotes,
  presentVotes,
}: {
  absentVotes: number;
  presentVotes: number;
}): boolean {
  return absentVotes > presentVotes;
}

/**
 * The score itself: what share of the goals you committed to did you actually turn up for.
 *
 *   100  a student with no finished goals yet, or one who has never missed
 *    89  five goals, one missed
 *    80  one goal, missed
 *     0  is reachable, but only after a long and consistent run of absences
 *
 * Rounded to a whole number because it is rendered beside a name in a 13px label, and no student
 * reading a feed card is served by "88.89".
 */
export function reliabilityScore({
  attended,
  noShows,
}: {
  attended: number;
  noShows: number;
}): number {
  const commitments = attended + noShows;
  if (commitments <= 0) return DEFAULT_RELIABILITY;

  const score = (100 * (attended + RELIABILITY_PRIOR)) / (commitments + RELIABILITY_PRIOR);
  // Clamped rather than trusted: a negative count would be a bug elsewhere, and a score outside
  // 0–100 would quietly break every layout that renders it.
  return Math.max(0, Math.min(100, Math.round(score)));
}
