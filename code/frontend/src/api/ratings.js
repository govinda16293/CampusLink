import { api } from './client';

/**
 * Ratings: who turned up.
 *
 * Both calls are scoped to one goal, because an answer is always about one person at one goal.
 * There is no endpoint for rating somebody in general, and that is deliberate — it is what stops
 * this becoming a way to follow a student around the platform marking them down.
 */
export const ratingsApi = {
  /** The other people in this lobby, and what this student has already said about each. */
  summary: (goalId) => api.get(`/goals/${goalId}/ratings`),
  submit: (goalId, ratings) => api.post(`/goals/${goalId}/ratings`, { ratings }),
};
