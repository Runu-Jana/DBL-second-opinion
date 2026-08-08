// Service CRUD — public GET, admin-protected writes
const express = require('express');
const prisma = require('../db');
const { requireAdmin } = require('./auth');

const router = express.Router();

function parseBody(body = {}) {
  return {
    title: String(body.title || '').trim(),
    description: String(body.description || '').trim(),
    longDescription: body.longDescription ? String(body.longDescription).trim() : null,
    price: Number.isFinite(+body.price) ? Math.max(0, parseInt(body.price, 10)) : 0,
    priceUnit: body.priceUnit ? String(body.priceUnit).trim() : null,
    icon: body.icon ? String(body.icon).trim() : 'report',
    featured: !!body.featured,
    active: body.active === undefined ? true : !!body.active,
    order: Number.isFinite(+body.order) ? parseInt(body.order, 10) : 0,
  };
}

// GET /api/services (public: active only; ?all=1 for admin)
router.get('/', async (req, res) => {
  try {
    const where = req.query.all === '1' ? {} : { active: true };
    const list = await prisma.service.findMany({
      where,
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not load services.' });
  }
});

// GET /api/services/:id (public)
router.get('/:id', async (req, res) => {
  try {
    const svc = await prisma.service.findUnique({ where: { id: +req.params.id } });
    if (!svc) return res.status(404).json({ error: 'Not found.' });
    res.json(svc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not load service.' });
  }
});

// POST /api/services (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const data = parseBody(req.body);
    if (!data.title || !data.description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }
    const created = await prisma.service.create({ data });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not create service.' });
  }
});

// PUT /api/services/:id (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const data = parseBody(req.body);
    if (!data.title || !data.description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }
    const updated = await prisma.service.update({ where: { id: +req.params.id }, data });
    res.json(updated);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e);
    res.status(500).json({ error: 'Could not update service.' });
  }
});

// DELETE /api/services/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.service.delete({ where: { id: +req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e);
    res.status(500).json({ error: 'Could not delete service.' });
  }
});

module.exports = router;
