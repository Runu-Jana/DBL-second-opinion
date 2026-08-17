// Admin authentication — login + JWT verification middleware
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { logActivity } = require('../lib/audit');
const { sendPasswordReset } = require('../lib/email');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

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

    const token = jwt.sign({ id: admin.id, email: admin.email, name: admin.name }, JWT_SECRET, { expiresIn: '8h' });
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
    const staff = await prisma.staff.findFirst({ where: { email: { equals: String(email).toLowerCase(), mode: 'insensitive' } } });
    if (!staff || !staff.password) return res.status(401).json({ error: 'Invalid email or password.' });
    const ok = await bcrypt.compare(password, staff.password);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });
    const token = jwt.sign({ id: staff.id, name: staff.name, email: staff.email, role: 'doctor' }, JWT_SECRET, { expiresIn: '8h' });
    logActivity(null, { kind: 'audit', actor: staff.name, action: 'Signed in', target: 'Doctor portal', category: 'Login' });
    res.json({ token, doctor: { id: staff.id, name: staff.name, email: staff.email, role: staff.role, department: staff.department } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Login failed.' }); }
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
    const token = jwt.sign({ id: patient.id, uhid: patient.uhid, name: patient.name, email: patient.email, role: 'patient' }, JWT_SECRET, { expiresIn: '365d' });
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
    const token = jwt.sign({ id: patient.id, uhid: patient.uhid, name: patient.name, email: patient.email, role: 'patient' }, JWT_SECRET, { expiresIn: '365d' });
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
    const login = jwt.sign({ id: patient.id, uhid: patient.uhid, name: patient.name, email: patient.email, role: 'patient' }, JWT_SECRET, { expiresIn: '365d' });
    res.json({ ok: true, token: login, patient: publicPatient(patient) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not reset your password. Please try again.' }); }
});

// Middleware — protects patient-portal routes
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
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated.' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

router.requireAdmin = requireAdmin;
router.requireDoctor = requireDoctor;
router.requirePatient = requirePatient;
module.exports = router;
module.exports.requireAdmin = requireAdmin;
module.exports.requireDoctor = requireDoctor;
module.exports.requirePatient = requirePatient;
module.exports.publicPatient = publicPatient;
