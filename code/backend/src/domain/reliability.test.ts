import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RELIABILITY,
  RELIABILITY_PRIOR,
  isAbsentByVote,
  reliabilityScore,
} from './reliability.js';

describe('isAbsentByVote — a majority, never one voice', () => {
  it.each([
    { absentVotes: 0, presentVotes: 0, expected: false, why: 'nobody answered' },
    { absentVotes: 1, presentVotes: 0, expected: true, why: 'the only answer says absent' },
    { absentVotes: 1, presentVotes: 1, expected: false, why: 'a tie goes to the student' },
    { absentVotes: 1, presentVotes: 2, expected: false, why: 'outvoted' },
    { absentVotes: 2, presentVotes: 1, expected: true, why: 'carried' },
    { absentVotes: 3, presentVotes: 3, expected: false, why: 'a larger tie is still a tie' },
  ])('$absentVotes absent vs $presentVotes present → $expected ($why)', (testCase) => {
    expect(isAbsentByVote(testCase)).toBe(testCase.expected);
  });

  it('cannot be swung by one annoyed person in a group of four', () => {
    // Three others rated: one says absent, two say present. The one loses.
    expect(isAbsentByVote({ absentVotes: 1, presentVotes: 2 })).toBe(false);
  });
});

describe('reliabilityScore', () => {
  it('starts everyone at 100 with no history', () => {
    expect(reliabilityScore({ attended: 0, noShows: 0 })).toBe(DEFAULT_RELIABILITY);
  });

  it('keeps a perfect record at 100 however long it is', () => {
    for (const attended of [1, 5, 50]) {
      expect(reliabilityScore({ attended, noShows: 0 })).toBe(100);
    }
  });

  it.each([
    { attended: 0, noShows: 1, expected: 80 },
    { attended: 5, noShows: 1, expected: 90 },
    { attended: 10, noShows: 2, expected: 88 },
    { attended: 1, noShows: 3, expected: 63 },
  ])('$attended attended and $noShows missed → $expected', ({ attended, noShows, expected }) => {
    expect(reliabilityScore({ attended, noShows })).toBe(expected);
  });

  it('costs a newcomer their first absence, but not everything', () => {
    const score = reliabilityScore({ attended: 0, noShows: 1 });
    expect(score).toBeLessThan(DEFAULT_RELIABILITY);
    // The whole point of the prior: one bad first goal is not a ruined account.
    expect(score).toBeGreaterThan(50);
  });

  it('separates a newcomer from a serial no-show, which a bare ratio would not', () => {
    // Both have attended nothing. A plain attended/(attended+noShows) would call both of them 0.
    expect(reliabilityScore({ attended: 0, noShows: 1 })).toBeGreaterThan(
      reliabilityScore({ attended: 0, noShows: 10 }),
    );
  });

  it('recovers as a student starts turning up again', () => {
    const afterMiss = reliabilityScore({ attended: 0, noShows: 1 });
    const afterComingBack = reliabilityScore({ attended: 5, noShows: 1 });
    expect(afterComingBack).toBeGreaterThan(afterMiss);
  });

  it('always lands inside 0–100, whatever it is handed', () => {
    const cases = [
      { attended: 0, noShows: 0 },
      { attended: 1000, noShows: 0 },
      { attended: 0, noShows: 1000 },
      // Negative counts would be a bug upstream; the score must still be renderable.
      { attended: -5, noShows: 0 },
      { attended: 0, noShows: -5 },
    ];
    for (const input of cases) {
      const score = reliabilityScore(input);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(score)).toBe(true);
    }
  });

  it('never rises when a student misses one more', () => {
    for (let attended = 0; attended <= 10; attended += 1) {
      for (let noShows = 0; noShows <= 10; noShows += 1) {
        expect(reliabilityScore({ attended, noShows: noShows + 1 })).toBeLessThanOrEqual(
          reliabilityScore({ attended, noShows }),
        );
      }
    }
  });

  it('never falls when a student turns up to one more', () => {
    for (let attended = 0; attended <= 10; attended += 1) {
      for (let noShows = 0; noShows <= 10; noShows += 1) {
        expect(reliabilityScore({ attended: attended + 1, noShows })).toBeGreaterThanOrEqual(
          reliabilityScore({ attended, noShows }),
        );
      }
    }
  });

  it('uses the documented prior, so the constant and the arithmetic agree', () => {
    // One absence and nothing else is exactly PRIOR / (1 + PRIOR).
    expect(reliabilityScore({ attended: 0, noShows: 1 })).toBe(
      Math.round((100 * RELIABILITY_PRIOR) / (1 + RELIABILITY_PRIOR)),
    );
  });
});
