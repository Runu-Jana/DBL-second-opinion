import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, patientApi, getPatientToken, setPatientToken, clearPatientToken } from '../api.js';

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

  // Restore the session from the stored token on load.
  useEffect(() => {
    if (!getPatientToken()) { setLoading(false); return; }
    patientApi('/portal/me')
      .then((r) => setSession(r.patient))
      .catch(() => clearPatientToken())
      .finally(() => setLoading(false));
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

  const value = {
    session, loading, authOpen, setAuthOpen, uploadOpen, setUploadOpen,
    requestUpload, login, signup, logout, refreshSession, setSession,
    forgotPassword, resetPassword, justSignedUp,
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
