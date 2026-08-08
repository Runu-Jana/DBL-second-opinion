import { createContext, useContext, useState, useCallback } from 'react';

/* Patient portal auth (front-end prototype — accounts in localStorage, as before).
   NOTE: front-end demo only; real PHI needs a secure backend. */
const AuthCtx = createContext(null);

const USERS_KEY = 'dbl_users';
const SESSION_KEY = 'dbl_session';

function readUsers() { try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch { return []; } }
function writeUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
function encode(str) { try { return btoa(unescape(encodeURIComponent(str))); } catch { return str; } }
export function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
  });
  const [authOpen, setAuthOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const requestUpload = useCallback(() => {
    if (session) setUploadOpen(true);
    else setAuthOpen(true);
  }, [session]);

  const finishLogin = useCallback((user) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setSession(user);
    setAuthOpen(false);
  }, []);

  const signup = useCallback(({ name, email, password }) => {
    email = email.trim().toLowerCase();
    const users = readUsers();
    if (users.some((u) => u.email === email)) throw new Error('An account with this email already exists. Please log in.');
    users.push({ name, email, pass: encode(password) });
    writeUsers(users);
    finishLogin({ name, email });
  }, [finishLogin]);

  const login = useCallback(({ email, password }) => {
    email = email.trim().toLowerCase();
    const user = readUsers().find((u) => u.email === email);
    if (!user || user.pass !== encode(password)) throw new Error('Email or password is incorrect. Please try again.');
    finishLogin({ name: user.name, email: user.email });
  }, [finishLogin]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
    setUploadOpen(false);
  }, []);

  const value = { session, authOpen, setAuthOpen, uploadOpen, setUploadOpen, requestUpload, login, signup, logout };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
