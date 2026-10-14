import { api } from './client';

/**
 * Trust and safety.
 *
 * Note what the student-facing half cannot do: there is no call that asks what happened to a
 * report, who else reported somebody, or whether anyone has blocked you. Each of those would turn
 * a safety feature into a way to find things out about other people, so the endpoint does not
 * exist rather than being merely absent from the UI.
 */
export const safetyApi = {
  /**
   * Report somebody. The target is named as context — a goal, a message or a profile — and the
   * server works out who is actually being reported. That is what lets an anonymous poster be
   * reported by somebody who cannot possibly know who they are.
   */
  report: (payload) => api.post('/reports', payload),

  blocks: () => api.get('/blocks'),
  block: (userId) => api.post(`/blocks/${userId}`),
  unblock: (userId) => api.delete(`/blocks/${userId}`),
};

/** Moderator-only. Every call here is refused with a 403 for an ordinary student. */
export const adminApi = {
  reports: (status) => api.get(`/admin/reports${status ? `?status=${status}` : ''}`),
  unmask: (reportId) => api.post(`/admin/reports/${reportId}/unmask`),
  review: (reportId, status, note = '') =>
    api.post(`/admin/reports/${reportId}/review`, { status, note }),
  audit: () => api.get('/admin/audit'),
};
