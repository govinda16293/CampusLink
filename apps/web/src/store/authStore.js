import { create } from 'zustand';
import { authApi } from '../api/auth';
import { setAuthToken } from '../api/client';

const TOKEN_STORAGE_KEY = 'campuslink.token';

/**
 * Session state.
 *
 * The token is persisted to localStorage so a refresh does not sign the user out. That is a
 * deliberate trade-off: localStorage is readable by any script on the origin, so it is only
 * acceptable because the app has no third-party scripts and the token is short-lived. The more
 * robust answer is an httpOnly refresh cookie, which is out of scope for this project.
 *
 * `status` distinguishes three states the UI must not confuse: 'loading' means we are still
 * checking a stored token, 'authenticated' and 'anonymous' are settled answers. Rendering the
 * login page during 'loading' would flash it in front of users who are in fact signed in.
 */
function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    // Private browsing or blocked site data — treat as signed out rather than crashing.
    return null;
  }
}

function writeStoredToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Non-fatal: the session simply will not survive a refresh.
  }
}

export const useAuthStore = create((set) => ({
  status: 'loading',
  user: null,
  token: null,

  /**
   * Called once when the app mounts.
   *
   * A stored token is not trusted on sight — it may be expired or belong to a deleted account,
   * so it is exchanged for the real user via /auth/me before the app treats anyone as signed in.
   */
  async initialise() {
    const token = readStoredToken();
    if (!token) {
      set({ status: 'anonymous', user: null, token: null });
      return;
    }

    setAuthToken(token);
    try {
      const { user } = await authApi.me();
      set({ status: 'authenticated', user, token });
    } catch {
      setAuthToken(null);
      writeStoredToken(null);
      set({ status: 'anonymous', user: null, token: null });
    }
  },

  /** Records a session returned by login or OTP verification. */
  setSession({ token, user }) {
    setAuthToken(token);
    writeStoredToken(token);
    set({ status: 'authenticated', user, token });
  },

  /**
   * Replaces the cached user after a profile save.
   *
   * The PATCH response already contains the updated profile, so the header and profile page
   * refresh from it directly rather than re-fetching /users/me.
   */
  updateUser(user) {
    set({ user });
  },

  logout() {
    setAuthToken(null);
    writeStoredToken(null);
    set({ status: 'anonymous', user: null, token: null });
  },
}));
