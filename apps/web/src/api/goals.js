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
  cancel: (id) => api.delete(`/goals/${id}`),
};
