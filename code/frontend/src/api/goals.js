import { api } from './client';

/** Goal endpoints. One function per call, so a route rename touches one file. */
export const goalsApi = {
  create: (payload) => api.post('/goals', payload),
  list: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
    ).toString();
    return api.get(`/goals${query ? `?${query}` : ''}`);
  },
  byId: (id) => api.get(`/goals/${id}`),
  /** Edit a posted goal. Only the fields that changed need to be sent. */
  update: (id, payload) => api.patch(`/goals/${id}`, payload),
  cancel: (id) => api.delete(`/goals/${id}`),

  /**
   * The lobby: who is actually going.
   *
   * Refused with a 404 to anyone outside the group, so a page should only call it when the goal
   * it already holds says `viewerIsMember`.
   */
  lobby: (id) => api.get(`/goals/${id}/lobby`),

  // The poster's lifecycle controls. Each answers with the goal as the server now sees it, the
  // same as the request actions, so a page adopts the response rather than guessing the new state.
  close: (id) => api.post(`/goals/${id}/close`),
  complete: (id) => api.post(`/goals/${id}/complete`),
  reopen: (id) => api.post(`/goals/${id}/reopen`),
};
