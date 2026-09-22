import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, patientApi, getPatientToken, setPatientToken, clearPatientToken, SESSION_ENDED } from '../api.js';

/* Patient portal auth — now backed by the real Express/Prisma backend.
   Signup/login hit /api/auth/patient-*, the JWT lives in localStorage['dbl_patient_token'],
   and `session` is the patient's real DB record (shared with admin + doctor panels). */
const AuthCtx = createContext(null);

export function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // the logged-in patient record, or null
  const [loading, setLoading] = useState(true);
  const [justSignedUp, setJustSignedUp] = useState(false); // true right after a new account is created
  const [authOpen, setAuthOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [unread, setUnread] = useState(0);   // unread notifications — drives the bell + sidebar badge

  // Restore the session from the stored token on load.
  useEffect(() => {
    if (!getPatientToken()) { setLoading(false); return; }
    patientApi('/portal/me')
      .then((r) => setSession(r.patient))
      .catch(() => clearPatientToken())
      .finally(() => setLoading(false));
  }, []);

  // If the backend rejects the stored token mid-session, drop the patient back to logged-out
  // rather than leaving a signed-in shell that can no longer load anything.
  useEffect(() => {
    const end = (e) => { if (e.detail?.portal === 'patient') setSession(null); };
    window.addEventListener(SESSION_ENDED, end);
    return () => window.removeEventListener(SESSION_ENDED, end);
  }, []);

  const requestUpload = useCallback(() => {
    if (session) setUploadOpen(true);
    else setAuthOpen(true);
  }, [session]);

  const finishLogin = useCallback((token, patient) => {
    setPatientToken(token);
    setSession(patient);
    setAuthOpen(false);
  }, []);

  const signup = useCallback(async ({ name, email, password }) => {
    const r = await api('/auth/patient-signup', { method: 'POST', auth: false, body: JSON.stringify({ name, email, password }) });
    finishLogin(r.token, r.patient);
    setJustSignedUp(true);   // greet first-time patients differently
  }, [finishLogin]);

  const login = useCallback(async ({ email, password }) => {
    const r = await api('/auth/patient-login', { method: 'POST', auth: false, body: JSON.stringify({ email, password }) });
    finishLogin(r.token, r.patient);
    setJustSignedUp(false);
  }, [finishLogin]);

  // Request a password-reset email. Returns the response (may include devResetUrl in dev).
  const forgotPassword = useCallback(async ({ email }) => {
    return api('/auth/patient-forgot', { method: 'POST', auth: false, body: JSON.stringify({ email }) });
  }, []);

  // Set a new password from a reset-link token, then log the patient in.
  const resetPassword = useCallback(async ({ token, password }) => {
    const r = await api('/auth/patient-reset', { method: 'POST', auth: false, body: JSON.stringify({ token, password }) });
    finishLogin(r.token, r.patient);
  }, [finishLogin]);

  const logout = useCallback(() => {
    clearPatientToken();
    setSession(null);
    setUploadOpen(false);
    setJustSignedUp(false);
  }, []);

  // Re-fetch the patient record (e.g. after a profile edit or a fresh upload).
  const refreshSession = useCallback(async () => {
    try { const r = await patientApi('/portal/me'); setSession(r.patient); return r.patient; }
    catch { return null; }
  }, []);

  // The unread notification count behind the bell and the sidebar badge. Kept here so the header,
  // the sidebar and the notifications page all read one number and all update together — the page
  // calls this after marking read, so the badge clears instead of lingering.
  const refreshUnread = useCallback(async () => {
    if (!getPatientToken()) { setUnread(0); return; }
    try { const r = await patientApi('/notifications/mine'); setUnread(Number(r.unread) || 0); }
    catch { /* leave the last known count rather than flashing to zero on a blip */ }
  }, []);

  // Load it whenever a session appears, and keep it fresh while they are signed in.
  useEffect(() => {
    if (!session) { setUnread(0); return undefined; }
    refreshUnread();
    const t = setInterval(refreshUnread, 60000);
    return () => clearInterval(t);
  }, [session, refreshUnread]);

  const value = {
    session, loading, authOpen, setAuthOpen, uploadOpen, setUploadOpen,
    requestUpload, finishLogin, login, signup, logout, refreshSession, setSession,
    forgotPassword, resetPassword, justSignedUp, unread, refreshUnread,
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
