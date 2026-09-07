import { api } from './client';

/** Profile endpoints. One function per call, so a route rename touches one file. */
export const usersApi = {
  me: () => api.get('/users/me'),
  updateMe: (payload) => api.patch('/users/me', payload),
  byId: (id) => api.get(`/users/${id}`),
  uploadPhoto: (dataUrl) => api.post('/users/me/photo', { dataUrl }),
  removePhoto: () => api.delete('/users/me/photo'),
};
