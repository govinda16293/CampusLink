import { describe, expect, it } from 'vitest';
import { REQUEST_STATUSES } from '@campuslink/shared';
import {
  genderAllows,
  joinEligibility,
  nextStatus,
  type EligibilityInput,
  type RequestAction,
} from './joinRequest.js';

const ACTIONS: RequestAction[] = ['accept', 'reject', 'withdraw', 'reopen'];

/**
 * The specification, written out independently of the implementation's table. Every status is
 * tried against every action below, so a move nobody intended to allow fails a test rather than
 * quietly becoming possible.
 */
const LEGAL: Record<string, Partial<Record<RequestAction, string>>> = {
  PENDING: { accept: 'ACCEPTED', reject: 'REJECTED', withdraw: 'WITHDRAWN' },
  ACCEPTED: { withdraw: 'WITHDRAWN' },
  REJECTED: {},
  WITHDRAWN: { reopen: 'PENDING' },
};

describe('nextStatus — the request state machine', () => {
  it('covers exactly the request statuses the rest of the app knows about', () => {
    expect(Object.keys(LEGAL).sort()).toEqual([...REQUEST_STATUSES].sort());
  });

  for (const from of Object.keys(LEGAL)) {
    for (const action of ACTIONS) {
      const expected = LEGAL[from]?.[action] ?? null;
      it(`${from} --${action}--> ${expected ?? 'refused'}`, () => {
        expect(nextStatus(from, action)).toBe(expected);
      });
    }
  }

  it('refuses every action on a status it does not recognise', () => {
    for (const action of ACTIONS) expect(nextStatus('ARCHIVED', action)).toBeNull();
  });
});

describe('genderAllows', () => {
  it.each([
    ['ANY', 'MALE', true],
    ['ANY', 'FEMALE', true],
    ['ANY', 'OTHER', true],
    ['ANY', 'UNDISCLOSED', true],
    ['FEMALE_ONLY', 'FEMALE', true],
    ['FEMALE_ONLY', 'MALE', false],
    ['FEMALE_ONLY', 'OTHER', false],
    ['FEMALE_ONLY', 'UNDISCLOSED', false],
    ['MALE_ONLY', 'MALE', true],
    ['MALE_ONLY', 'FEMALE', false],
    ['MALE_ONLY', 'OTHER', false],
    ['MALE_ONLY', 'UNDISCLOSED', false],
  ])('%s admits %s: %s', (preference, gender, expected) => {
    expect(genderAllows(preference, gender)).toBe(expected);
  });
});

describe('joinEligibility', () => {
  const inAnHour = new Date(Date.now() + 3_600_000);
  const input = (overrides: Partial<EligibilityInput> = {}, goal = {}): EligibilityInput => ({
    viewerId: 'student',
    viewerGender: 'UNDISCLOSED',
    existingStatus: null,
    ...overrides,
    goal: {
      posterId: 'poster',
      status: 'OPEN',
      expiresAt: inAnHour,
      headcount: 2,
      acceptedCount: 0,
      genderPreference: 'ANY',
      ...goal,
    },
  });

  it('lets a student ask to join an open goal', () => {
    expect(joinEligibility(input()).canRequest).toBe(true);
  });

  it('refuses the poster their own goal', () => {
    expect(joinEligibility(input({ viewerId: 'poster' })).reason).toBe('OWN_GOAL');
  });

  it('refuses a cancelled goal', () => {
    expect(joinEligibility(input({}, { status: 'CANCELLED' })).reason).toBe('NOT_OPEN');
  });

  it('refuses a goal whose time has passed', () => {
    const past = new Date(Date.now() - 1000);
    expect(joinEligibility(input({}, { expiresAt: past })).reason).toBe('EXPIRED');
  });

  it('treats a goal with no expiry as not expired', () => {
    expect(joinEligibility(input({}, { expiresAt: null })).canRequest).toBe(true);
  });

  it('refuses a goal with no spots left', () => {
    expect(joinEligibility(input({}, { acceptedCount: 2 })).reason).toBe('FULL');
  });

  it('tells an accepted member they are in, even once the goal has filled', () => {
    const result = joinEligibility(
      input({ existingStatus: 'ACCEPTED' }, { status: 'FULL', acceptedCount: 2 }),
    );
    expect(result.reason).toBe('ALREADY_ACCEPTED');
  });

  it('reports a cancelled goal as over, even to somebody who had been accepted', () => {
    const result = joinEligibility(input({ existingStatus: 'ACCEPTED' }, { status: 'CANCELLED' }));
    expect(result.reason).toBe('NOT_OPEN');
  });

  it('refuses a duplicate while the first request is pending', () => {
    expect(joinEligibility(input({ existingStatus: 'PENDING' })).reason).toBe('ALREADY_PENDING');
  });

  it('does not let a declined student ask again', () => {
    expect(joinEligibility(input({ existingStatus: 'REJECTED' })).reason).toBe('DECLINED');
  });

  it('lets a student who withdrew ask again', () => {
    expect(joinEligibility(input({ existingStatus: 'WITHDRAWN' })).canRequest).toBe(true);
  });

  it('enforces the gender preference, pointing an undisclosed student at their profile', () => {
    const restricted = { genderPreference: 'FEMALE_ONLY' };
    const undisclosed = joinEligibility(input({ viewerGender: 'UNDISCLOSED' }, restricted));
    expect(undisclosed.reason).toBe('GENDER');
    expect(undisclosed.message).toContain('profile');

    expect(joinEligibility(input({ viewerGender: 'MALE' }, restricted)).reason).toBe('GENDER');
    expect(joinEligibility(input({ viewerGender: 'FEMALE' }, restricted)).canRequest).toBe(true);
  });

  it('checks capacity before gender, so a full goal never reads as a personal refusal', () => {
    const result = joinEligibility(
      input({ viewerGender: 'MALE' }, { genderPreference: 'FEMALE_ONLY', acceptedCount: 2 }),
    );
    expect(result.reason).toBe('FULL');
  });
});
