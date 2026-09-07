import { GENDER } from '@campuslink/shared';

/**
 * How much of a student's optional profile is filled in, as a percentage.
 *
 * Pure and dependency-free so it can be unit-tested exhaustively. Step 10 ranks the pending
 * request queue partly on this, and the home page nudges students who are below 100% — computing
 * it in one tested place now avoids a second, differently-wrong copy later.
 *
 * `name` and `email` are excluded because signup guarantees them: including fields nobody can be
 * missing would inflate every score and make the signal useless for ranking. `photoUrl` is
 * excluded too, for now — uploads do not exist until Step 7, so counting it would cap everyone
 * at 75% and make the nudge impossible to dismiss by acting on it. Add it to this list in Step 7.
 */
export interface ProfileCompletenessInput {
  branch: string | null;
  year: number | null;
  gender: string;
  interests: string[];
}

const CRITERIA: ReadonlyArray<{
  key: string;
  isComplete: (profile: ProfileCompletenessInput) => boolean;
}> = [
  { key: 'branch', isComplete: (p) => Boolean(p.branch) },
  { key: 'year', isComplete: (p) => p.year !== null && p.year !== undefined },
  // UNDISCLOSED is the default every account starts on, so it counts as "not answered" rather
  // than as a deliberate choice.
  { key: 'gender', isComplete: (p) => Boolean(p.gender) && p.gender !== GENDER.UNDISCLOSED },
  { key: 'interests', isComplete: (p) => p.interests.length > 0 },
];

/** Percentage, 0–100, rounded to a whole number. */
export function profileCompleteness(profile: ProfileCompletenessInput): number {
  const done = CRITERIA.filter((criterion) => criterion.isComplete(profile)).length;
  return Math.round((done / CRITERIA.length) * 100);
}

/** Which fields are still blank — lets the UI say what to fill in, not just show a number. */
export function missingProfileFields(profile: ProfileCompletenessInput): string[] {
  return CRITERIA.filter((criterion) => !criterion.isComplete(profile)).map((c) => c.key);
}
