// Oncologist CRUD — public GET, admin-protected writes
const express = require('express');
const prisma = require('../db');
const { requireAdmin } = require('./auth');

const router = express.Router();

// Normalise/validate incoming oncologist payloads
function parseBody(body = {}) {
  return {
    name: String(body.name || '').trim(),
    specialty: String(body.specialty || '').trim(),
    qualifications: String(body.qualifications || '').trim(),
    experience: Number.isFinite(+body.experience) ? Math.max(0, parseInt(body.experience, 10)) : 0,
    hospital: body.hospital ? String(body.hospital).trim() : null,
    city: body.city ? String(body.city).trim() : null,
    bio: body.bio ? String(body.bio).trim() : null,
    photoUrl: body.photoUrl ? String(body.photoUrl).trim() : null,
    rating: Number.isFinite(+body.rating) ? Math.min(5, Math.max(0, +body.rating)) : 4.8,
    featured: !!body.featured,
    active: body.active === undefined ? true : !!body.active,
  };
}

// GET /api/oncologists  (public) — only active by default; ?all=1 for admin lists
router.get('/', async (req, res) => {
  try {
    const where = req.query.all === '1' ? {} : { active: true };
    const list = await prisma.oncologist.findMany({
      where,
      orderBy: [{ featured: 'desc' }, { rating: 'desc' }, { name: 'asc' }],
    });
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not load oncologists.' });
  }
});

// GET /api/oncologists/:id (public)
router.get('/:id', async (req, res) => {
  try {
    const doc = await prisma.oncologist.findUnique({ where: { id: +req.params.id } });
    if (!doc) return res.status(404).json({ error: 'Not found.' });
    res.json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not load oncologist.' });
  }
});

// POST /api/oncologists (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const data = parseBody(req.body);
    if (!data.name || !data.specialty || !data.qualifications) {
      return res.status(400).json({ error: 'Name, specialty and qualifications are required.' });
    }
    const created = await prisma.oncologist.create({ data });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not create oncologist.' });
  }
});

// PUT /api/oncologists/:id (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const data = parseBody(req.body);
    if (!data.name || !data.specialty || !data.qualifications) {
      return res.status(400).json({ error: 'Name, specialty and qualifications are required.' });
    }
    const updated = await prisma.oncologist.update({ where: { id: +req.params.id }, data });
    res.json(updated);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e);
    res.status(500).json({ error: 'Could not update oncologist.' });
  }
});

// DELETE /api/oncologists/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.oncologist.delete({ where: { id: +req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e);
    res.status(500).json({ error: 'Could not delete oncologist.' });
  }
});

module.exports = router;
