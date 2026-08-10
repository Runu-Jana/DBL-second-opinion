// Admin authentication — login + JWT verification middleware
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { logActivity } = require('../lib/audit');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

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
module.exports = router;
module.exports.requireAdmin = requireAdmin;
module.exports.requireDoctor = requireDoctor;
