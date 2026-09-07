/**
 * The single HTTP entry point for the web client.
 *
 * Every call to the API goes through `apiRequest`, which gives us one place to attach the auth
 * token (Step 1), and one place that understands the API's uniform error envelope
 * `{ error: { code, message, details } }`. Components therefore only ever have to catch
 * `ApiError` — they never deal with raw fetch responses or status codes.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    /** Field-keyed validation messages, when the failure was a VALIDATION_ERROR. */
    this.details = details;
  }
}

export async function apiRequest(path, { method = 'GET', body, headers = {}, signal } = {}) {
  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (cause) {
    // Network-level failure: the API is down, or the browser is offline.
    if (cause?.name === 'AbortError') throw cause;
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the CampusLink server.');
  }

  if (response.status === 204) return null;

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = payload?.error ?? {};
    throw new ApiError(
      response.status,
      error.code ?? 'UNKNOWN_ERROR',
      error.message ?? 'Something went wrong.',
      error.details,
    );
  }

  return payload;
}

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiRequest(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => apiRequest(path, { ...options, method: 'DELETE' }),
};
