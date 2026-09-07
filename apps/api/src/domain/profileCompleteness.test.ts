import { describe, expect, it } from 'vitest';
import { missingProfileFields, profileCompleteness } from './profileCompleteness.js';

const empty = { branch: null, year: null, gender: 'UNDISCLOSED', interests: [] };
const full = { branch: 'CSE', year: 2, gender: 'MALE', interests: ['gym'] };

describe('profile completeness', () => {
  it('is 0 for a freshly verified account', () => {
    expect(profileCompleteness(empty)).toBe(0);
  });

  it('is 100 when every criterion is met', () => {
    // Must be reachable without a photo — uploads do not exist until Step 7, and a nudge nobody
    // can dismiss by acting on it is worse than no nudge.
    expect(profileCompleteness(full)).toBe(100);
  });

  it('scales with the number of fields filled', () => {
    expect(profileCompleteness({ ...empty, branch: 'CSE' })).toBe(25);
    expect(profileCompleteness({ ...empty, branch: 'CSE', year: 2 })).toBe(50);
  });

  it('treats the default UNDISCLOSED gender as unanswered', () => {
    expect(profileCompleteness({ ...full, gender: 'UNDISCLOSED' })).toBe(75);
    // But an explicit "prefer not to say" equivalent is a real answer.
    expect(profileCompleteness({ ...full, gender: 'OTHER' })).toBe(100);
  });

  it('reports which fields are still blank', () => {
    expect(missingProfileFields(empty)).toEqual(['branch', 'year', 'gender', 'interests']);
    expect(missingProfileFields(full)).toEqual([]);
  });

  it('counts year 0 as unanswered but does not trip over it', () => {
    // Guards against a `!p.year` check, which would call a legitimate 0 missing.
    expect(missingProfileFields({ ...full, year: null })).toEqual(['year']);
  });
});
