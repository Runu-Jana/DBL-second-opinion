// Admin authentication — login + JWT verification middleware
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../db');
const { logActivity } = require('../lib/audit');
const { sendPasswordReset, sendDoctorInvite } = require('../lib/email');

const router = express.Router();
// Never fall back to a weak default in production — a known secret means anyone can forge
// admin/patient tokens. Refuse to boot instead; warn loudly in dev.
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') throw new Error('FATAL: JWT_SECRET must be set in production.');
  console.warn('[auth] JWT_SECRET is not set — using an INSECURE dev default. Set JWT_SECRET before deploying.');
  return 'dev-secret';
})();

// How long a signed-in session lasts. Everyone — admin/counsellor, doctor and patient —
// gets the same 15 days, so nobody is asked to log in again during normal day-to-day use.
// The client stores the token per-device, so a different phone or browser still needs the
// password; after 15 days the token expires on its own and the login screen comes back.
const SESSION_TTL = '15d';

// A staff member's job decides which portal they land in. Everyone used to be stamped
// role:'doctor' regardless, so a receptionist signing in got the doctor's panel — empty, since
// every query there is scoped to reports assigned to them by name.
const REVIEWER_ROLES = ['Oncologist', 'Surgeon', 'Radiologist'];
const COUNSELLOR_ROLES = ['Counsellor', 'Care Coordinator'];
function portalFor(staffRole) {
  if (REVIEWER_ROLES.includes(staffRole)) return 'doctor';
  if (COUNSELLOR_ROLES.includes(staffRole)) return 'counsellor';
  return null;   // no portal for this job
}

// Patient record without the password hash — safe to return to the client.
const publicPatient = (p) => ({
  id: p.id, name: p.name, email: p.email, uhid: p.uhid, phone: p.phone, city: p.city,
  age: p.age, gender: p.gender, status: p.status, doctor: p.doctor, cancerType: p.cancerType,
  stage: p.stage, lastVisit: p.lastVisit,
});

// POST /api/auth/login  { email, password } -> { token, admin }
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const admin = await prisma.admin.findUnique({ where: { email: String(email).toLowerCase() } });
    if (!admin) return res.status(401).json({ error: 'Invalid email or password.' });

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign({ id: admin.id, email: admin.email, name: admin.name, role: 'admin' }, JWT_SECRET, { expiresIn: SESSION_TTL });
    logActivity(null, { kind: 'audit', actor: admin.name || admin.email, action: 'Signed in', target: 'Admin panel', category: 'Login' });
    res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// POST /api/auth/doctor-login  { email, password } -> { token, doctor }
router.post('/doctor-login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    const staff = await prisma.staff.findFirst({ where: { email: { equals: String(email).trim().toLowerCase(), mode: 'insensitive' } } });
    if (!staff) return res.status(401).json({ error: 'Invalid email or password.' });
    // Distinguish "never activated" from "wrong password". This is an internal staff portal,
    // and collapsing both into one message made a setup problem impossible to tell from a typo.
    if (!staff.password) {
      return res.status(403).json({ error: 'This account has not set a password yet. Use the "Forgot password?" link below to create one.' });
    }
    const ok = await bcrypt.compare(password, staff.password);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });
    const portal = portalFor(staff.role);
    if (!portal) {
      return res.status(403).json({ error: `The staff portal is for clinical and counselling staff. Your account is set up as ${staff.role || 'staff'} — please contact the admin team.` });
    }
    const token = jwt.sign({ id: staff.id, name: staff.name, email: staff.email, role: portal, jobRole: staff.role }, JWT_SECRET, { expiresIn: SESSION_TTL });
    logActivity(null, { kind: 'audit', actor: staff.name, action: 'Signed in', target: `${portal === 'counsellor' ? 'Counsellor' : 'Doctor'} portal`, category: 'Login' });
    res.json({ token, portal, doctor: { id: staff.id, name: staff.name, email: staff.email, role: staff.role, department: staff.department } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Login failed.' }); }
});

/* ---------- Doctor Portal credentials ----------------------------------------
   A newly-created doctor has NO password. They receive a one-time link and choose
   their own; email is their username. Tokens are stateless JWTs (same pattern as
   the patient reset) so no extra DB columns are needed. ------------------------ */
const linkOrigin = (req) => req.headers.origin || process.env.PUBLIC_URL || '';
const publicDoctor = (s) => ({ id: s.id, name: s.name, email: s.email, role: s.role, department: s.department });

// Fingerprint of the account's CURRENT password state. It's embedded in every
// set-password link and re-checked when the link is used, which makes each link
// single-use: the moment a password is set the fingerprint changes, so the old
// link (and any copy of that email) stops working. No extra DB columns needed.
const pwFingerprint = (staff) =>
  crypto.createHash('sha256').update(`${staff.id}:${staff.password || 'unset'}`).digest('hex').slice(0, 16);

// Emails a doctor/staff member a "set your password" link. Called on approve + admin create.
async function inviteStaff(staff, origin) {
  if (!staff || !staff.email) return { skipped: true, reason: 'no email on record' };
  const token = jwt.sign({ id: staff.id, email: staff.email, purpose: 'dr-activate', pw: pwFingerprint(staff) }, JWT_SECRET, { expiresIn: '7d' });
  const url = `${origin}/doctor/set-password?token=${encodeURIComponent(token)}`;
  const r = await sendDoctorInvite({ to: staff.email, name: staff.name, url, loginUrl: `${origin}/doctor` });
  if (r.skipped && process.env.NODE_ENV !== 'production') console.log('[doctor-invite:DEV] set-password link:', url);
  return { ...r, url };
}

// POST /api/auth/doctor-set-password  { token, password } -> sets the password and signs them in.
// Serves both first-time activation ('dr-activate') and forgot-password ('dr-pwreset').
router.post('/doctor-set-password', async (req, res) => {
  try {
    const token = String(req.body?.token || '');
    const password = String(req.body?.password || '');
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    let payload;
    try { payload = jwt.verify(token, JWT_SECRET); }
    catch { return res.status(400).json({ error: 'This link is invalid or has expired. Please request a new one.' }); }
    if (!['dr-activate', 'dr-pwreset'].includes(payload.purpose)) return res.status(400).json({ error: 'Invalid link.' });
    const staff = await prisma.staff.findUnique({ where: { id: payload.id } });
    if (!staff) return res.status(400).json({ error: 'Account not found.' });
    // Single-use: the link is void once it has been used (or the password changed since).
    if (payload.pw !== pwFingerprint(staff)) {
      return res.status(400).json({ error: 'This link has already been used. Please use “Forgot password?” to get a new one.' });
    }

    const hash = await bcrypt.hash(password, 10);
    await prisma.staff.update({ where: { id: staff.id }, data: { password: hash } });
    const login = jwt.sign({ id: staff.id, name: staff.name, email: staff.email, role: portalFor(staff.role) || 'doctor', jobRole: staff.role }, JWT_SECRET, { expiresIn: SESSION_TTL });
    logActivity(null, {
      kind: 'audit', actor: staff.name, target: 'Doctor portal', category: 'Login',
      action: payload.purpose === 'dr-activate' ? 'Activated account and set password' : 'Reset portal password',
    });
    res.json({ ok: true, token: login, doctor: publicDoctor(staff) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not set your password. Please try again.' }); }
});

// POST /api/auth/doctor-forgot  { email } -> emails a link. Always answers generically (no
// account enumeration). Sends an activation link if they never set a password, else a reset link.
router.post('/doctor-forgot', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Please enter your email address.' });
    const staff = await prisma.staff.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    let devResetUrl;
    if (staff && staff.email) {
      const activating = !staff.password;
      const purpose = activating ? 'dr-activate' : 'dr-pwreset';
      const token = jwt.sign({ id: staff.id, email: staff.email, purpose, pw: pwFingerprint(staff) }, JWT_SECRET, { expiresIn: activating ? '7d' : '30m' });
      const url = `${linkOrigin(req)}/doctor/set-password?token=${encodeURIComponent(token)}`;
      try {
        const r = activating
          ? await sendDoctorInvite({ to: staff.email, name: staff.name, url, loginUrl: `${linkOrigin(req)}/doctor` })
          : await sendPasswordReset({ to: staff.email, name: staff.name, url });
        if (r.skipped && process.env.NODE_ENV !== 'production') { console.log('[doctor-pwreset:DEV] link:', url); devResetUrl = url; }
      } catch (e) { console.error('doctor reset email failed:', e.message); }
    }
    res.json({ ok: true, ...(devResetUrl ? { devResetUrl } : {}) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not process the request. Please try again.' }); }
});

// POST /api/auth/patient-signup  { name, email, password } -> creates OR claims a Patient + token.
// If a Patient with that email already exists (e.g. auto-created by an earlier report upload)
// and has no password yet, this claims it; otherwise a fresh Patient is created.
router.post('/patient-signup', async (req, res) => {
  try {
    const b = req.body || {};
    const name = String(b.name || '').trim();
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    let patient = await prisma.patient.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (patient && patient.password) return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    const hash = await bcrypt.hash(password, 10);
    if (patient) {
      patient = await prisma.patient.update({ where: { id: patient.id }, data: { password: hash, name: patient.name || name, email } });
    } else {
      const uhid = 'DBL' + (100000 + Math.floor(Math.random() * 900000));
      patient = await prisma.patient.create({ data: { name, email, password: hash, uhid, status: 'New Patient' } });
    }
    logActivity(null, { kind: 'activity', actor: patient.name, action: `New patient account: ${patient.name}`, category: 'Patient' });
    const token = jwt.sign({ id: patient.id, uhid: patient.uhid, name: patient.name, email: patient.email, role: 'patient' }, JWT_SECRET, { expiresIn: SESSION_TTL });
    res.status(201).json({ token, patient: publicPatient(patient) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not create your account.' }); }
});

// POST /api/auth/patient-login  { email, password } -> token + patient
router.post('/patient-login', async (req, res) => {
  try {
    const b = req.body || {};
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    const patient = await prisma.patient.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, password: { not: null } } });
    if (!patient) return res.status(401).json({ error: 'Email or password is incorrect.' });
    const ok = await bcrypt.compare(password, patient.password);
    if (!ok) return res.status(401).json({ error: 'Email or password is incorrect.' });
    const token = jwt.sign({ id: patient.id, uhid: patient.uhid, name: patient.name, email: patient.email, role: 'patient' }, JWT_SECRET, { expiresIn: SESSION_TTL });
    res.json({ token, patient: publicPatient(patient) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Login failed.' }); }
});

// POST /api/auth/patient-forgot  { email } -> email a reset link. Always responds generically
// (never reveals whether an account exists) to avoid email enumeration.
router.post('/patient-forgot', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Please enter your email address.' });
    const patient = await prisma.patient.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, password: { not: null } } });
    let devResetUrl;
    if (patient) {
      const token = jwt.sign({ id: patient.id, email: patient.email, purpose: 'pwreset' }, JWT_SECRET, { expiresIn: '30m' });
      const origin = req.headers.origin || process.env.PUBLIC_URL || '';
      const url = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
      try {
        const r = await sendPasswordReset({ to: patient.email, name: patient.name, url });
        if (r.skipped && process.env.NODE_ENV !== 'production') { console.log('[pwreset:DEV] reset link:', url); devResetUrl = url; }
      } catch (e) { console.error('password reset email failed:', e.message); }
    }
    res.json({ ok: true, ...(devResetUrl ? { devResetUrl } : {}) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not process the request. Please try again.' }); }
});

// POST /api/auth/patient-reset  { token, password } -> set a new password and log in
router.post('/patient-reset', async (req, res) => {
  try {
    const token = String(req.body?.token || '');
    const password = String(req.body?.password || '');
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    let payload;
    try { payload = jwt.verify(token, JWT_SECRET); } catch { return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' }); }
    if (payload.purpose !== 'pwreset') return res.status(400).json({ error: 'Invalid reset link.' });
    const patient = await prisma.patient.findUnique({ where: { id: payload.id } });
    if (!patient) return res.status(400).json({ error: 'Account not found.' });
    const hash = await bcrypt.hash(password, 10);
    await prisma.patient.update({ where: { id: patient.id }, data: { password: hash } });
    const login = jwt.sign({ id: patient.id, uhid: patient.uhid, name: patient.name, email: patient.email, role: 'patient' }, JWT_SECRET, { expiresIn: SESSION_TTL });
    res.json({ ok: true, token: login, patient: publicPatient(patient) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not reset your password. Please try again.' }); }
});

// Middleware — protects patient-portal routes
function requireCounsellor(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'counsellor') return res.status(403).json({ error: 'Not a counsellor account.' });
    req.counsellor = payload;
    next();
  } catch { res.status(401).json({ error: 'Session expired. Please log in again.' }); }
}

function requirePatient(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'patient') return res.status(403).json({ error: 'Not a patient account.' });
    req.patient = payload;
    next();
  } catch { res.status(401).json({ error: 'Session expired. Please log in again.' }); }
}

// Middleware — protects doctor-portal routes
function requireDoctor(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'doctor') return res.status(403).json({ error: 'Not a doctor account.' });
    req.doctor = payload;
    next();
  } catch { res.status(401).json({ error: 'Session expired. Please log in again.' }); }
}

// GET /api/auth/me -> current admin (verifies token)
router.get('/me', requireAdmin, async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({ where: { id: req.admin.id }, select: { id: true, name: true, email: true } });
    res.json({ admin: admin || req.admin });
  } catch { res.json({ admin: req.admin }); }
});

// Middleware — protects admin-only routes
// Every token this app issues is signed with the same secret, so verifying the signature only
// proves we minted it — not who for. requireDoctor and requirePatient check their role; this
// did not, which let any patient or doctor session (and even a single-use password-reset token)
// reach every admin endpoint. Admin tokens carry role:"admin"; tokens issued before that change
// carry no role at all, so those are still accepted until they expire.
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.purpose) return res.status(403).json({ error: 'Not an admin account.' });   // reset / activation link
    if (payload.role && payload.role !== 'admin') return res.status(403).json({ error: 'Not an admin account.' });
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

router.requireAdmin = requireAdmin;
router.requireDoctor = requireDoctor;
router.requirePatient = requirePatient;
// Mint a patient session. Shared with the lead pop-up: verifying a one-time code proves the
// visitor controls that inbox, which is the same standard a magic link meets, so it earns a
// session just as a password login does.
function signPatient(patient) {
  return jwt.sign({ id: patient.id, uhid: patient.uhid, name: patient.name, email: patient.email, role: 'patient' }, JWT_SECRET, { expiresIn: SESSION_TTL });
}

module.exports = router;
module.exports.requireAdmin = requireAdmin;
module.exports.requireDoctor = requireDoctor;
module.exports.requirePatient = requirePatient;
module.exports.publicPatient = publicPatient;
module.exports.inviteStaff = inviteStaff;   // used by doctor-application approve + admin staff create
module.exports.linkOrigin = linkOrigin;

module.exports.signPatient = signPatient;
module.exports.requireCounsellor = requireCounsellor;
module.exports.portalFor = portalFor;