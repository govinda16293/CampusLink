import { describe, expect, it } from 'vitest';
import { dateAndTimeToIso, isoToDateAndTime } from './datetime.js';

/**
 * Regression tests for "a goal posted with a time shows Anytime on the feed".
 *
 * The form originally used one `datetime-local` input and called
 * `new Date(input.value).toISOString()` in the change handler. Safari rejects the seconds-less,
 * zoneless string that input produces, so the call threw inside a React event handler — where
 * nothing catches it — and the goal reached the API with no time on it. These pin the behaviour
 * of the two plain inputs that replaced it.
 *
 * Times are asserted by round-tripping rather than against fixed instants, so the results do not
 * depend on the timezone of the machine running the tests.
 */
describe('dateAndTimeToIso', () => {
  it('combines a date and a time into an instant', () => {
    expect(isoToDateAndTime(dateAndTimeToIso('2030-09-08', '18:30'))).toEqual({
      date: '2030-09-08',
      time: '18:30',
    });
  });

  it('ignores seconds, which some browsers append to a time input', () => {
    expect(isoToDateAndTime(dateAndTimeToIso('2030-09-08', '18:30:00'))).toEqual({
      date: '2030-09-08',
      time: '18:30',
    });
  });

  it('handles midnight and the last minute of the day', () => {
    expect(isoToDateAndTime(dateAndTimeToIso('2030-09-08', '00:00')).time).toBe('00:00');
    expect(isoToDateAndTime(dateAndTimeToIso('2030-09-08', '23:59')).time).toBe('23:59');
  });

  it('returns null when both parts are missing, which means a whenever goal', () => {
    expect(dateAndTimeToIso('', '')).toBeNull();
    expect(dateAndTimeToIso(null, undefined)).toBeNull();
  });

  it('returns null when only one half is filled in', () => {
    // The form turns this into "Pick a time as well" rather than posting a timeless goal.
    expect(dateAndTimeToIso('2030-09-08', '')).toBeNull();
    expect(dateAndTimeToIso('', '18:30')).toBeNull();
  });

  it('returns null rather than throwing on values it cannot read', () => {
    // A browser without native date support renders a plain text box, so anything can arrive.
    expect(dateAndTimeToIso('08/09/2030', '6:30 pm')).toBeNull();
    expect(dateAndTimeToIso('tomorrow', 'evening')).toBeNull();
    expect(dateAndTimeToIso('2030-09-08', '25:00')).toBeNull();
    expect(dateAndTimeToIso('2030-09-08', '18:75')).toBeNull();
  });

  it('rejects a calendar date that does not exist instead of rolling it over', () => {
    // new Date(2030, 1, 31) silently becomes 3 March, which is not what anyone picked.
    expect(dateAndTimeToIso('2030-02-31', '18:30')).toBeNull();
  });

  it('accepts 29 February in a leap year', () => {
    expect(dateAndTimeToIso('2032-02-29', '18:30')).not.toBeNull();
    expect(dateAndTimeToIso('2030-02-29', '18:30')).toBeNull();
  });
});

describe('isoToDateAndTime', () => {
  it('returns empty strings for a goal with no time', () => {
    expect(isoToDateAndTime(null)).toEqual({ date: '', time: '' });
    expect(isoToDateAndTime('')).toEqual({ date: '', time: '' });
  });

  it('returns empty strings rather than NaN padding for a corrupt instant', () => {
    expect(isoToDateAndTime('not-a-date')).toEqual({ date: '', time: '' });
  });
});
