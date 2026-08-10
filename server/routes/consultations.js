// Consultation CRUD — admin only (clinical encounter / second-opinion records)
const express = require('express');
const prisma = require('../db');
const { requireAdmin } = require('./auth');
const { logCrud } = require('../lib/audit');

const router = express.Router();

const STATUSES = ['Pending', 'In Review', 'Report Ready', 'Completed', 'Cancelled'];

function parseBody(b = {}) {
  return {
    patientName: String(b.patientName || '').trim(),
    patientUhid: b.patientUhid ? String(b.patientUhid).trim() : null,
    doctor: b.doctor ? String(b.doctor).trim() : null,
    type: b.type ? String(b.type).trim() : 'Second Opinion',
    date: b.date ? String(b.date).trim() : null,
    cancerType: b.cancerType ? String(b.cancerType).trim() : null,
    summary: b.summary ? String(b.summary).trim() : null,
    recommendation: b.recommendation ? String(b.recommendation).trim() : null,
    status: STATUSES.includes(b.status) ? b.status : 'Pending',
    fee: Number.isFinite(+b.fee) ? Math.max(0, parseInt(b.fee, 10)) : 0,
    notes: b.notes ? String(b.notes).trim() : null,
  };
}

// GET /api/consultations (admin) — ?q= search, ?status= filter
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { q, status } = req.query;
    const where = {};
    if (status && STATUSES.includes(status)) where.status = status;
    if (q) {
      where.OR = [
        { patientName: { contains: String(q), mode: 'insensitive' } },
        { doctor: { contains: String(q), mode: 'insensitive' } },
        { cancerType: { contains: String(q), mode: 'insensitive' } },
      ];
    }
    const list = await prisma.consultation.findMany({ where, orderBy: [{ updatedAt: 'desc' }] });
    res.json(list);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load consultations.' }); }
});

// GET /api/consultations/:id (admin)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const c = await prisma.consultation.findUnique({ where: { id: +req.params.id } });
    if (!c) return res.status(404).json({ error: 'Not found.' });
    res.json(c);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load consultation.' }); }
});

// POST /api/consultations (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const data = parseBody(req.body);
    if (!data.patientName) return res.status(400).json({ error: 'Patient is required.' });
    const created = await prisma.consultation.create({ data });
    logCrud(req, 'Created', 'Consultation', created.patientName, { activity: true });
    res.status(201).json(created);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not create consultation.' }); }
});

// PUT /api/consultations/:id (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const data = parseBody(req.body);
    if (!data.patientName) return res.status(400).json({ error: 'Patient is required.' });
    const updated = await prisma.consultation.update({ where: { id: +req.params.id }, data });
    logCrud(req, 'Updated', 'Consultation', updated.patientName);
    res.json(updated);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e); res.status(500).json({ error: 'Could not update consultation.' });
  }
});

// DELETE /api/consultations/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await prisma.consultation.delete({ where: { id: +req.params.id } });
    logCrud(req, 'Deleted', 'Consultation', deleted.patientName);
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e); res.status(500).json({ error: 'Could not delete consultation.' });
  }
});

module.exports = router;
module.exports.STATUSES = STATUSES;
