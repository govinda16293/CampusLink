/**
 * Domain enums shared by the API and the web client.
 *
 * These mirror the enums declared in `apps/api/prisma/schema.prisma`. Keeping one copy here
 * means the feed filter bar, the create-goal form and the API validation layer can never drift
 * apart on what a valid category or status is.
 */

/** The college email domain the platform is restricted to (proposal §3.3). */
export const ALLOWED_EMAIL_DOMAIN = 'thapar.edu';

/** Goal categories shown on the feed. NOTES branches to a 1-on-1 chat instead of a lobby. */
export const GOAL_CATEGORY = {
  SPORTS: 'SPORTS',
  GYM: 'GYM',
  STUDY: 'STUDY',
  TRAVEL: 'TRAVEL',
  FOOD: 'FOOD',
  EVENTS: 'EVENTS',
  NOTES: 'NOTES',
  OTHER: 'OTHER',
};

/** Human-readable labels for the categories above. */
export const GOAL_CATEGORY_LABEL = {
  SPORTS: 'Sports',
  GYM: 'Gym',
  STUDY: 'Study group',
  TRAVEL: 'Travel / cab share',
  FOOD: 'Food',
  EVENTS: 'Events',
  NOTES: 'Notes / resources',
  OTHER: 'Other',
};

/** Goal lifecycle states — see the activity diagram in the UML document. */
export const GOAL_STATUS = {
  OPEN: 'OPEN',
  FULL: 'FULL',
  CLOSED: 'CLOSED',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
  CANCELLED: 'CANCELLED',
};

/** Join-request lifecycle states. */
export const REQUEST_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
};

/** Lobby lifecycle states. */
export const LOBBY_STATUS = {
  FORMING: 'FORMING',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

/** User gender — drives the gender-preference filter on goals (proposal §3.3). */
export const GENDER = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
  UNDISCLOSED: 'UNDISCLOSED',
};

/** Who a poster will accept requests from. ANY is the default. */
export const GENDER_PREFERENCE = {
  ANY: 'ANY',
  MALE_ONLY: 'MALE_ONLY',
  FEMALE_ONLY: 'FEMALE_ONLY',
};

export const USER_ROLE = {
  STUDENT: 'STUDENT',
  ADMIN: 'ADMIN',
};

/** Convenience: arrays for iterating in <select> elements and Zod enums. */
export const GOAL_CATEGORIES = Object.values(GOAL_CATEGORY);
export const GOAL_STATUSES = Object.values(GOAL_STATUS);
export const REQUEST_STATUSES = Object.values(REQUEST_STATUS);
export const LOBBY_STATUSES = Object.values(LOBBY_STATUS);
export const GENDERS = Object.values(GENDER);
export const GENDER_PREFERENCES = Object.values(GENDER_PREFERENCE);
export const USER_ROLES = Object.values(USER_ROLE);
