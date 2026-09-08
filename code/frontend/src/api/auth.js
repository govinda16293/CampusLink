import { api } from './client';

/**
 * Auth endpoints, one function per call.
 *
 * Keeping the URLs in a single module means a route rename touches one file, and components
 * never build request paths by hand.
 */
export const authApi = {
  signup: (payload) => api.post('/auth/signup', payload),
  verifyOtp: (payload) => api.post('/auth/verify-otp', payload),
  resendOtp: (email) => api.post('/auth/resend-otp', { email }),
  login: (payload) => api.post('/auth/login', payload),
  me: () => api.get('/auth/me'),
};
