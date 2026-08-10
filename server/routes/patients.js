// Patient CRUD — admin only (patient data is never public)
const express = require('express');
const prisma = require('../db');
const { requireAdmin } = require('./auth');
const { logCrud } = require('../lib/audit');

const router = express.Router();

const STATUSES = ['New Patient', 'Under Treatment', 'Follow-up', 'Completed', 'Discharged'];

function parseBody(b = {}) {
  return {
    name: String(b.name || '').trim(),
    uhid: b.uhid ? String(b.uhid).trim() : '',
    age: Number.isFinite(+b.age) && b.age !== '' && b.age !== null ? Math.max(0, parseInt(b.age, 10)) : null,
    gender: b.gender ? String(b.gender).trim() : null,
    phone: b.phone ? String(b.phone).trim() : null,
    email: b.email ? String(b.email).trim() : null,
    city: b.city ? String(b.city).trim() : null,
    cancerType: b.cancerType ? String(b.cancerType).trim() : null,
    stage: b.stage ? String(b.stage).trim() : null,
    status: STATUSES.includes(b.status) ? b.status : 'New Patient',
    doctor: b.doctor ? String(b.doctor).trim() : null,
    lastVisit: b.lastVisit ? String(b.lastVisit).trim() : null,
    notes: b.notes ? String(b.notes).trim() : null,
  };
}

const genUhid = () => 'DBL' + (100000 + Math.floor(Math.random() * 900000));

// GET /api/patients (admin) — supports ?q= search and ?status= filter
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { q, status } = req.query;
    const where = {};
    if (status && STATUSES.includes(status)) where.status = status;
    if (q) {
      where.OR = [
        { name: { contains: String(q), mode: 'insensitive' } },
        { uhid: { contains: String(q), mode: 'insensitive' } },
        { cancerType: { contains: String(q), mode: 'insensitive' } },
      ];
    }
    const list = await prisma.patient.findMany({ where, orderBy: [{ updatedAt: 'desc' }] });
    res.json(list);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load patients.' }); }
});

// GET /api/patients/:id (admin)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const p = await prisma.patient.findUnique({ where: { id: +req.params.id } });
    if (!p) return res.status(404).json({ error: 'Not found.' });
    res.json(p);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load patient.' }); }
});

// POST /api/patients (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const data = parseBody(req.body);
    if (!data.name) return res.status(400).json({ error: 'Patient name is required.' });
    if (!data.uhid) data.uhid = genUhid();
    const created = await prisma.patient.create({ data });
    logCrud(req, 'Created', 'Patient', created.name, { activity: true });
    res.status(201).json(created);
  } catch (e) {
    if (e.code === 'P2002') return res.status(400).json({ error: 'That UHID is already in use.' });
    console.error(e); res.status(500).json({ error: 'Could not create patient.' });
  }
});

// PUT /api/patients/:id (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const data = parseBody(req.body);
    if (!data.name) return res.status(400).json({ error: 'Patient name is required.' });
    if (!data.uhid) data.uhid = genUhid();
    const updated = await prisma.patient.update({ where: { id: +req.params.id }, data });
    logCrud(req, 'Updated', 'Patient', updated.name);
    res.json(updated);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    if (e.code === 'P2002') return res.status(400).json({ error: 'That UHID is already in use.' });
    console.error(e); res.status(500).json({ error: 'Could not update patient.' });
  }
});

// DELETE /api/patients/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await prisma.patient.delete({ where: { id: +req.params.id } });
    logCrud(req, 'Deleted', 'Patient', deleted.name);
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e); res.status(500).json({ error: 'Could not delete patient.' });
  }
});

module.exports = router;
module.exports.STATUSES = STATUSES;
