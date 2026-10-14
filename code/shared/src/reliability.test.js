import { describe, expect, it } from 'vitest';
import { RELIABILITY_BANDS, reliabilityLabel } from './reliability.js';

describe('reliabilityLabel', () => {
  it.each([
    [100, 'Very reliable'],
    [90, 'Very reliable'],
    [89, 'Reliable'],
    [75, 'Reliable'],
    [74, 'Mixed'],
    [50, 'Mixed'],
    [49, 'Often absent'],
    [0, 'Often absent'],
  ])('%i reads as %s', (score, expected) => {
    expect(reliabilityLabel(score)).toBe(expected);
  });

  it('calls a fresh account very reliable, matching the 100 it is given', () => {
    expect(reliabilityLabel(100)).toBe('Very reliable');
  });

  it('has a band for every score from 0 to 100, with no gap to fall through', () => {
    for (let score = 0; score <= 100; score += 1) {
      expect(typeof reliabilityLabel(score)).toBe('string');
    }
  });

  it('lists its bands highest first, which is what makes the lookup correct', () => {
    const mins = RELIABILITY_BANDS.map((band) => band.min);
    expect(mins).toEqual([...mins].sort((a, b) => b - a));
  });
});
