/**
 * DentAI – Auth Manager Module
 * Handles user authentication and session management.
 */

const AuthManager = (() => {
  const SESSION_KEY = 'dentai_current_user';
  let currentUser = null;

  function init() {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        currentUser = JSON.parse(stored);
      }
    } catch {
      currentUser = null;
    }
  }

  async function login(username, password) {
    try {
      const res = await fetch('https://swift-worms-own.loca.lt/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
        body: JSON.stringify({ username, password })
      });
      
      if (res.ok) {
        const data = await res.json();
        const user = data.user;
        currentUser = user;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user;
      }
      
      // Fallback for hardcoded mock admin/demo accounts if not in MongoDB yet
      const fallbackUser = typeof DB !== 'undefined' ? DB.getUser(username) : null;
      if (fallbackUser && (username === 'admin' || username === 'doctor' || username === 'researcher')) {
        currentUser = fallbackUser;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(fallbackUser));
        return fallbackUser;
      }
      
      throw new Error('Invalid credentials');
    } catch(err) {
      if (err.message === 'Invalid credentials') throw err;
      
      // Network error fallback
      const fallbackUser = typeof DB !== 'undefined' ? DB.getUser(username) : null;
      if (fallbackUser && (username === 'admin' || username === 'doctor' || username === 'researcher')) {
        currentUser = fallbackUser;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(fallbackUser));
        return fallbackUser;
      }
      throw new Error('Failed to connect to database');
    }
  }

  function logout() {
    currentUser = null;
    sessionStorage.removeItem(SESSION_KEY);
  }

  function getUser() {
    return currentUser;
  }

  function isLoggedIn() {
    return !!currentUser;
  }

  function getRole() {
    return currentUser ? currentUser.role : null;
  }

  // Initialize on load
  init();

  return {
    login,
    logout,
    getUser,
    isLoggedIn,
    getRole
  };
})();
