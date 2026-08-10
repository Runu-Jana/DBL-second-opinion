// Doctor & Staff CRUD — admin only (internal staff directory)
const express = require('express');
const prisma = require('../db');
const { requireAdmin } = require('./auth');
const { logCrud } = require('../lib/audit');

const router = express.Router();

const STATUSES = ['Active', 'On Leave', 'Inactive'];

function parseBody(b = {}) {
  return {
    name: String(b.name || '').trim(),
    role: String(b.role || '').trim(),
    department: b.department ? String(b.department).trim() : null,
    specialties: b.specialties ? String(b.specialties).trim() : null,
    qualifications: b.qualifications ? String(b.qualifications).trim() : null,
    email: b.email ? String(b.email).trim() : null,
    phone: b.phone ? String(b.phone).trim() : null,
    status: STATUSES.includes(b.status) ? b.status : 'Active',
    onCall: !!b.onCall,
    photoUrl: b.photoUrl ? String(b.photoUrl).trim() : null,
    joinedDate: b.joinedDate ? String(b.joinedDate).trim() : null,
    bio: b.bio ? String(b.bio).trim() : null,
  };
}

// GET /api/staff (admin) — ?q= search, ?status= filter
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { q, status } = req.query;
    const where = {};
    if (status && STATUSES.includes(status)) where.status = status;
    if (q) {
      where.OR = [
        { name: { contains: String(q), mode: 'insensitive' } },
        { role: { contains: String(q), mode: 'insensitive' } },
        { department: { contains: String(q), mode: 'insensitive' } },
      ];
    }
    const list = await prisma.staff.findMany({ where, orderBy: [{ name: 'asc' }] });
    res.json(list);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load staff.' }); }
});

// GET /api/staff/:id (admin)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const s = await prisma.staff.findUnique({ where: { id: +req.params.id } });
    if (!s) return res.status(404).json({ error: 'Not found.' });
    res.json(s);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load staff member.' }); }
});

// POST /api/staff (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const data = parseBody(req.body);
    if (!data.name || !data.role) return res.status(400).json({ error: 'Name and role are required.' });
    const created = await prisma.staff.create({ data });
    logCrud(req, 'Created', 'Staff', created.name, { activity: true });
    res.status(201).json(created);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not create staff member.' }); }
});

// PUT /api/staff/:id (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const data = parseBody(req.body);
    if (!data.name || !data.role) return res.status(400).json({ error: 'Name and role are required.' });
    const updated = await prisma.staff.update({ where: { id: +req.params.id }, data });
    logCrud(req, 'Updated', 'Staff', updated.name);
    res.json(updated);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e); res.status(500).json({ error: 'Could not update staff member.' });
  }
});

// DELETE /api/staff/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await prisma.staff.delete({ where: { id: +req.params.id } });
    logCrud(req, 'Deleted', 'Staff', deleted.name);
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e); res.status(500).json({ error: 'Could not delete staff member.' });
  }
});

module.exports = router;
module.exports.STATUSES = STATUSES;
