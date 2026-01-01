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
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
};
