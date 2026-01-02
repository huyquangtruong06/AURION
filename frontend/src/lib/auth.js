/**
 * Authentication Utilities
 */

export const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('session_token');
};

export const setToken = (token) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('session_token', token);
};

export const removeToken = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('session_token');
};

export const isAuthenticated = () => {
  return !!getToken();
};

export const logout = () => {
  removeToken();
  // Clear all localStorage data to prevent data leakage between accounts
  if (typeof window !== 'undefined') {
    localStorage.removeItem('currentBotId');
    window.location.href = '/';
  }
};
