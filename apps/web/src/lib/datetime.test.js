import { describe, expect, it } from 'vitest';
import { isoToLocalInput, localInputToIso } from './datetime.js';

/**
 * Regression tests for the "goal posted with a time shows Anytime" bug.
 *
 * The original code called `new Date(input.value).toISOString()` directly. Safari rejects the
 * seconds-less, zoneless string a `datetime-local` input produces, so that threw inside a React
 * change handler — where nothing catches it — and the goal reached the API with no time on it.
 * These assertions pin the behaviour that replaced it.
 */
describe('localInputToIso', () => {
  it('accepts the exact shape a datetime-local input produces', () => {
    // No seconds and no timezone: the string Safari's Date parser used to reject.
    expect(localInputToIso('2030-09-08T18:30')).not.toBeNull();
  });

  it('preserves the wall-clock time the student picked', () => {
    // Asserted by round-tripping rather than against a fixed instant, so the test does not
    // depend on the timezone the machine running it happens to be in.
    expect(isoToLocalInput(localInputToIso('2030-09-08T18:30'))).toBe('2030-09-08T18:30');
  });

  it('accepts a value that carries seconds, which some browsers append', () => {
    expect(isoToLocalInput(localInputToIso('2030-09-08T18:30:00'))).toBe('2030-09-08T18:30');
  });

  it('returns null for an empty or missing value, meaning a whenever goal', () => {
    expect(localInputToIso('')).toBeNull();
    expect(localInputToIso(null)).toBeNull();
    expect(localInputToIso(undefined)).toBeNull();
  });

  it('returns null rather than throwing on an unparseable value', () => {
    // A browser without datetime-local support renders a plain text box, so anything can arrive.
    expect(localInputToIso('tomorrow evening')).toBeNull();
    expect(localInputToIso('08/09/2030 6:30 pm')).toBeNull();
    // Date-only: the student has not chosen a time yet, so there is nothing to post.
    expect(localInputToIso('2030-09-08')).toBeNull();
  });

  it('rejects a calendar date that does not exist instead of rolling it over', () => {
    // new Date(2030, 1, 31) silently becomes 3 March, which is not what anyone picked.
    expect(localInputToIso('2030-02-31T18:30')).toBeNull();
  });

  it('handles midnight and the last minute of the day', () => {
    expect(isoToLocalInput(localInputToIso('2030-09-08T00:00'))).toBe('2030-09-08T00:00');
    expect(isoToLocalInput(localInputToIso('2030-09-08T23:59'))).toBe('2030-09-08T23:59');
  });
});

describe('isoToLocalInput', () => {
  it('returns an empty string for a goal with no time', () => {
    expect(isoToLocalInput(null)).toBe('');
    expect(isoToLocalInput('')).toBe('');
  });

  it('returns an empty string rather than NaN padding for a corrupt instant', () => {
    expect(isoToLocalInput('not-a-date')).toBe('');
  });
});
