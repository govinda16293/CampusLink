import { api } from './client';

/**
 * Join-request endpoints.
 *
 * Every call that changes a request answers with `{ request, goal }` — the goal as the server now
 * sees it — so the page can adopt it rather than work out spots left or status for itself.
 */
export const requestsApi = {
  create: (goalId, message = '') => api.post(`/goals/${goalId}/requests`, { message }),
  listForGoal: (goalId) => api.get(`/goals/${goalId}/requests`),
  accept: (requestId) => api.post(`/requests/${requestId}/accept`),
  reject: (requestId) => api.post(`/requests/${requestId}/reject`),
  withdraw: (requestId) => api.post(`/requests/${requestId}/withdraw`),
};
