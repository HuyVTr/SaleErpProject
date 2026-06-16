/**
 * Utility helper for managing authentication tokens and user session in localStorage.
 * Centralizing this logic avoids split/inconsistent state keys.
 */

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'current_user';

// Keys to clean up from older implementations to prevent legacy state pollution
const LEGACY_KEYS = ['token', 'auth_token', 'user'];

export const tokenStorage = {
  /**
   * Get the current authentication token
   * @returns {string|null}
   */
  getToken: () => {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Get the current refresh token
   * @returns {string|null}
   */
  getRefreshToken: () => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Set authentication token and clean legacy keys
   * @param {string} token 
   */
  setToken: (token) => {
    localStorage.setItem(TOKEN_KEY, token);
    // Remove legacy tokens to maintain single source of truth
    LEGACY_KEYS.forEach(key => {
      if (key !== TOKEN_KEY) {
        localStorage.removeItem(key);
      }
    });
  },

  /**
   * Set refresh token
   * @param {string} token
   */
  setRefreshToken: (token) => {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  /**
   * Get the parsed current user object
   * @returns {object|null}
   */
  getUser: () => {
    const rawUser = localStorage.getItem(USER_KEY);
    if (!rawUser) return null;
    try {
      return JSON.parse(rawUser);
    } catch (error) {
      console.error('Failed to parse user session storage:', error);
      // If data is corrupt, clear session to be safe
      tokenStorage.clear();
      return null;
    }
  },

  /**
   * Set the user object and clean legacy keys
   * @param {object} user 
   */
  setUser: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.removeItem('user'); // Clean legacy user key
  },

  /**
   * Clear all session data (token and user info)
   */
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
  }
};

export default tokenStorage;
