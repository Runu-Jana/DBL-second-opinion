// Exercises the REAL helper source from client/src/api.js (stripped of `export` so it can be
// evaluated here) against synthetic tokens, with browser globals stubbed.
const fs = require('fs');
const src = fs.readFileSync('client/src/api.js', 'utf8');
const helpers = src.slice(src.indexOf('const TOKEN_KEY'), src.indexOf('export async function api'))
  .replace(/^export /gm, '');

const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
global.atob = (b) => Buffer.from(b, 'base64').toString('binary');
const scope = {};
new Function('localStorage', 'atob', helpers + '\nreturn { getPatientToken, setPatientToken, clearPatientToken, getDoctorToken, setDoctorToken, getToken, setToken };')
  .call(scope, global.localStorage, global.atob);
const H = new Function('localStorage', 'atob', helpers + '\nreturn { getPatientToken, setPatientToken, getDoctorToken, setDoctorToken, getToken, setToken, clearPatientToken };')(global.localStorage, global.atob);

const jwt = require(require('path').join(process.cwd(), 'node_modules', 'jsonwebtoken'));
const mk = (payload, opts) => jwt.sign(payload, 'test', opts);

let pass = 0, fail = 0;
const check = (name, got, want) => {
  const ok = got === want;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`}`);
};

// 1. A fresh 15-day session survives.
const fresh = mk({ id: 1, role: 'patient' }, { expiresIn: '15d' });
H.setPatientToken(fresh);
check('fresh 15d token is returned', H.getPatientToken(), fresh);

// 2. Day 14 — still inside the window.
const day14 = mk({ id: 1, iat: Math.floor(Date.now() / 1000) - 14 * 86400 }, { expiresIn: '15d', noTimestamp: true });
H.setPatientToken(day14);
check('token on day 14 still valid', H.getPatientToken(), day14);

// 3. Past 15 days — gone, and scrubbed from storage.
const day16 = mk({ id: 1, iat: Math.floor(Date.now() / 1000) - 16 * 86400 }, { expiresIn: '15d', noTimestamp: true });
H.setPatientToken(day16);
check('token past 15 days is rejected', H.getPatientToken(), null);
check('expired token is removed from storage', store['dbl_patient_token'], undefined);

// 4. Non-ASCII name in the payload must NOT cause a false logout (the reason for the regex).
const accented = mk({ id: 2, name: 'Dr. José Ángel Muñoz — Oncología' }, { expiresIn: '15d' });
H.setDoctorToken(accented);
check('accented name keeps the session', H.getDoctorToken(), accented);

// 5. Garbage / tampered token is treated as no session.
H.setToken('not-a-jwt');
check('malformed token is rejected', H.getToken(), null);
check('malformed token is removed', store['dbl_admin_token'], undefined);

// 6. Each portal has its own key — signing out of one leaves the others alone.
H.setToken(fresh); H.setPatientToken(fresh); H.setDoctorToken(fresh);
H.clearPatientToken();
check('clearing patient leaves admin', H.getToken(), fresh);
check('clearing patient leaves doctor', H.getDoctorToken(), fresh);
check('cleared patient really is gone', H.getPatientToken(), null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
