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

/**
 * Degree programmes, as listed on a Thapar student record.
 *
 * Keys are the official codes where the programme has one; the remaining few are derived from
 * the programme name, since they are only ever used as stable database values — the label below
 * is what a student actually reads. Step 10 scores "same branch" as a matching signal, which is
 * why this is an enum rather than a free-text field: "CSE" and "Computer Science" typed by two
 * students would never match.
 */
export const BRANCH = {
  COE: 'COE',
  CSE: 'CSE',
  COBS: 'COBS',
  AIML: 'AIML',
  ECE: 'ECE',
  ENC: 'ENC',
  EE: 'EE',
  EEC: 'EEC',
  EIC: 'EIC',
  RAI: 'RAI',
  EVD: 'EVD',
  ME: 'ME',
  MECHATRONICS: 'MECHATRONICS',
  CHEMICAL: 'CHEMICAL',
  CIVIL: 'CIVIL',
  CIVIL_COMPUTER_APPLICATIONS: 'CIVIL_COMPUTER_APPLICATIONS',
  BIOTECHNOLOGY: 'BIOTECHNOLOGY',
  BIOMEDICAL: 'BIOMEDICAL',
  CSE_DERA_BASSI: 'CSE_DERA_BASSI',
  OTHER: 'OTHER',
};

/** Full programme names, shown in the profile dropdown. */
export const BRANCH_LABEL = {
  COE: 'Computer Engineering (COE)',
  CSE: 'Computer Science and Engineering (CSE)',
  COBS: 'Computer Science and Business Systems (COBS)',
  AIML: 'Artificial Intelligence and Machine Learning (AIML)',
  ECE: 'Electronics and Communication Engineering (ECE)',
  ENC: 'Electronics and Computer Engineering (ENC)',
  EE: 'Electrical Engineering (EE)',
  EEC: 'Electrical and Computer Engineering (EEC)',
  EIC: 'Electronics (Instrumentation and Control) Engineering (EIC)',
  RAI: 'Robotics and Artificial Intelligence (RAI)',
  EVD: 'Electronics Engineering (VLSI Design and Technology) (EVD)',
  ME: 'Mechanical Engineering (ME)',
  MECHATRONICS: 'Mechatronics Engineering',
  CHEMICAL: 'Chemical Engineering',
  CIVIL: 'Civil Engineering',
  CIVIL_COMPUTER_APPLICATIONS: 'Civil Engineering with Computer Applications',
  BIOTECHNOLOGY: 'Biotechnology',
  BIOMEDICAL: 'Biomedical Engineering',
  CSE_DERA_BASSI: 'Computer Science and Engineering (Dera Bassi)',
  // Not on the official list. Kept so a postgraduate or exchange student has something to pick
  // rather than leaving the field blank, which would read as an unfinished profile.
  OTHER: 'Other programme',
};

/** Years of study offered. */
export const STUDY_YEARS = [1, 2, 3, 4, 5];

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
export const BRANCHES = Object.values(BRANCH);
