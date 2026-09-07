// Tiny API helper. Talks to the same Express backend (/api/...).
// ---- Sessions -------------------------------------------------------------------------
// A signed-in session lasts 15 days (SESSION_TTL in server/routes/auth.js) and is kept in
// localStorage, so closing the tab or the browser doesn't sign anyone out — but the token
// never leaves this device, so a different phone or browser still asks for the password.
// The JWT carries its own expiry: once it passes we drop the token here rather than send a
// dead one and get a 401 back, so the user lands on the login screen instead of a broken page.
const TOKEN_KEY = 'dbl_admin_token';
const PATIENT_TOKEN_KEY = 'dbl_patient_token';
const DOCTOR_TOKEN_KEY = 'dbl_doctor_token';

// Milliseconds at which a JWT expires, or 0 if it can't be read. The payload is pulled out
// with a regex rather than JSON.parse: atob() gives us latin1, so a name with an accent in
// it would break parsing and log a perfectly valid user out.
function expiresAt(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const m = /"exp"\s*:\s*(\d+)/.exec(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')));
    return m ? Number(m[1]) * 1000 : 0;
  } catch { return 0; }
}

function readSession(key) {
  const token = localStorage.getItem(key);
  if (!token) return null;
  if (expiresAt(token) > Date.now()) return token;
  localStorage.removeItem(key);   // expired, or unreadable — either way it's no longer a session
  return null;
}

// Fired when the backend rejects a stored token (expired, or the account was disabled). Each
// portal listens and drops back to its login screen instead of leaving a dead dashboard up.
export const SESSION_ENDED = 'dbl-session-ended';

function endSession(portal, key) {
  localStorage.removeItem(key);
  window.dispatchEvent(new CustomEvent(SESSION_ENDED, { detail: { portal } }));
}

export function endDoctorSession() { endSession('doctor', DOCTOR_TOKEN_KEY); }

export function getToken() { return readSession(TOKEN_KEY); }
export function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

export function getPatientToken() { return readSession(PATIENT_TOKEN_KEY); }
export function setPatientToken(t) { localStorage.setItem(PATIENT_TOKEN_KEY, t); }
export function clearPatientToken() { localStorage.removeItem(PATIENT_TOKEN_KEY); }

export function getDoctorToken() { return readSession(DOCTOR_TOKEN_KEY); }
export function setDoctorToken(t) { localStorage.setItem(DOCTOR_TOKEN_KEY, t); }
export function clearDoctorToken() { localStorage.removeItem(DOCTOR_TOKEN_KEY); }

export async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token && opts.auth !== false) headers.Authorization = 'Bearer ' + token;

  const res = await fetch('/api' + path, { ...opts, headers });
  let body = {};
  try { body = await res.json(); } catch { /* empty */ }
  if (res.status === 401 && headers.Authorization) endSession('admin', TOKEN_KEY);
  if (res.status === 401 && opts.on401) opts.on401();
  if (!res.ok) throw new Error(body.error || 'Request failed.');
  return body;
}

// Patient-portal API — sends the patient token (separate from the admin token).
export async function patientApi(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const token = getPatientToken();
  if (token) headers.Authorization = 'Bearer ' + token;

  const res = await fetch('/api' + path, { ...opts, headers });
  let body = {};
  try { body = await res.json(); } catch { /* empty */ }
  if (res.status === 401 && headers.Authorization) endSession('patient', PATIENT_TOKEN_KEY);
  if (res.status === 401 && opts.on401) opts.on401();
  if (!res.ok) throw new Error(body.error || 'Request failed.');
  return body;
}

export function rupees(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }
