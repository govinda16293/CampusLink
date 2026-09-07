import { describe, expect, it } from 'vitest';
import {
  ALLOWED_EMAIL_DOMAIN,
  GOAL_CATEGORIES,
  GOAL_CATEGORY,
  GOAL_CATEGORY_LABEL,
  REQUEST_STATUSES,
} from './index.js';

describe('shared enums', () => {
  it('restricts the platform to the college email domain', () => {
    expect(ALLOWED_EMAIL_DOMAIN).toBe('thapar.edu');
  });

  it('gives every goal category a human-readable label', () => {
    // Guards against adding a category to the enum but forgetting the label the feed renders,
    // which would otherwise show "undefined" as a filter chip.
    for (const category of GOAL_CATEGORIES) {
      expect(GOAL_CATEGORY_LABEL[category], `missing label for ${category}`).toBeTruthy();
    }
  });

  it('keeps the notes/resource category, which branches to a 1-on-1 chat', () => {
    expect(GOAL_CATEGORIES).toContain(GOAL_CATEGORY.NOTES);
  });

  it('exposes the four request states of the join workflow', () => {
    expect(REQUEST_STATUSES).toEqual(['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']);
  });
});
