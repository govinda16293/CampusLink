/**
 * How a reliability score reads to a student.
 *
 * Lives in shared rather than beside the scoring maths in the API, because it is the one part of
 * reliability both sides need: the client renders it next to the number, and keeping a second copy
 * over there is how "Reliable" and "Mixed" end up meaning different things in two places. The
 * arithmetic that produces the score stays on the server, where it belongs — a client cannot be
 * trusted to compute a trust signal.
 */

/** Lower bound of each band, highest first. */
export const RELIABILITY_BANDS = [
  { min: 90, label: 'Very reliable' },
  { min: 75, label: 'Reliable' },
  { min: 50, label: 'Mixed' },
  { min: 0, label: 'Often absent' },
];

export function reliabilityLabel(score) {
  return RELIABILITY_BANDS.find((band) => score >= band.min)?.label ?? 'Often absent';
}
