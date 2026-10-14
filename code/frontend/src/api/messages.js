import { api } from './client';

/**
 * Lobby chat endpoints.
 *
 * Sending is a plain POST, not a socket event. The socket only delivers what this has already
 * accepted, so there is exactly one path that can put a message into a conversation and exactly
 * one place where permission to do so is checked.
 */
export const messagesApi = {
  /** One page of history, newest first. `before` is the id of the oldest message on screen. */
  list: (goalId, { before, limit } = {}) => {
    const query = new URLSearchParams(
      Object.entries({ before, limit }).filter(([, value]) => value !== undefined),
    ).toString();
    return api.get(`/goals/${goalId}/messages${query ? `?${query}` : ''}`);
  },
  send: (goalId, body) => api.post(`/goals/${goalId}/messages`, { body }),
};
