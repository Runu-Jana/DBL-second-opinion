// Appointment CRUD — admin only
const express = require('express');
const prisma = require('../db');
const { requireAdmin } = require('./auth');
const { logCrud } = require('../lib/audit');

const router = express.Router();

const STATUSES = ['Upcoming', 'Confirmed', 'Pending', 'Completed', 'Cancelled'];
const MODES = ['In-person', 'Video'];

function parseBody(b = {}) {
  return {
    patientName: String(b.patientName || '').trim(),
    patientUhid: b.patientUhid ? String(b.patientUhid).trim() : null,
    doctor: b.doctor ? String(b.doctor).trim() : null,
    type: b.type ? String(b.type).trim() : 'New Consultation',
    date: b.date ? String(b.date).trim() : null,
    time: b.time ? String(b.time).trim() : null,
    mode: MODES.includes(b.mode) ? b.mode : 'In-person',
    status: STATUSES.includes(b.status) ? b.status : 'Upcoming',
    notes: b.notes ? String(b.notes).trim() : null,
  };
}

// GET /api/appointments (admin) — ?q= search, ?status= filter
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { q, status } = req.query;
    const where = {};
    if (status && STATUSES.includes(status)) where.status = status;
    if (q) {
      where.OR = [
        { patientName: { contains: String(q), mode: 'insensitive' } },
        { doctor: { contains: String(q), mode: 'insensitive' } },
        { type: { contains: String(q), mode: 'insensitive' } },
      ];
    }
    const list = await prisma.appointment.findMany({ where, orderBy: [{ updatedAt: 'desc' }] });
    res.json(list);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load appointments.' }); }
});

// GET /api/appointments/:id (admin)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const a = await prisma.appointment.findUnique({ where: { id: +req.params.id } });
    if (!a) return res.status(404).json({ error: 'Not found.' });
    res.json(a);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load appointment.' }); }
});

// POST /api/appointments (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const data = parseBody(req.body);
    if (!data.patientName) return res.status(400).json({ error: 'Patient is required.' });
    const created = await prisma.appointment.create({ data });
    logCrud(req, 'Created', 'Appointment', created.patientName, { activity: true });
    res.status(201).json(created);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not create appointment.' }); }
});

// PUT /api/appointments/:id (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const data = parseBody(req.body);
    if (!data.patientName) return res.status(400).json({ error: 'Patient is required.' });
    const updated = await prisma.appointment.update({ where: { id: +req.params.id }, data });
    logCrud(req, 'Updated', 'Appointment', updated.patientName);
    res.json(updated);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e); res.status(500).json({ error: 'Could not update appointment.' });
  }
});

// DELETE /api/appointments/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await prisma.appointment.delete({ where: { id: +req.params.id } });
    logCrud(req, 'Deleted', 'Appointment', deleted.patientName);
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e); res.status(500).json({ error: 'Could not delete appointment.' });
  }
});

module.exports = router;
module.exports.STATUSES = STATUSES;
