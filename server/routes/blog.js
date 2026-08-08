// Blog / Resources — public GET, admin-protected writes
const express = require('express');
const prisma = require('../db');
const { requireAdmin } = require('./auth');

const router = express.Router();

function parseBody(b = {}) {
  return {
    title: String(b.title || '').trim(),
    category: String(b.category || '').trim() || 'Cancer Guide',
    excerpt: String(b.excerpt || '').trim(),
    imageUrl: b.imageUrl ? String(b.imageUrl).trim() : null,
    date: b.date ? String(b.date).trim() : null,
    readTime: b.readTime ? String(b.readTime).trim() : null,
    isVideo: !!b.isVideo,
    active: b.active === undefined ? true : !!b.active,
    order: Number.isFinite(+b.order) ? parseInt(b.order, 10) : 0,
  };
}

// GET /api/blog (public: active only; ?all=1 for admin)
router.get('/', async (req, res) => {
  try {
    const where = req.query.all === '1' ? {} : { active: true };
    const list = await prisma.blogPost.findMany({ where, orderBy: [{ order: 'asc' }, { id: 'asc' }] });
    res.json(list);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load posts.' }); }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const data = parseBody(req.body);
    if (!data.title || !data.excerpt) return res.status(400).json({ error: 'Title and excerpt are required.' });
    res.status(201).json(await prisma.blogPost.create({ data }));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not create post.' }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const data = parseBody(req.body);
    if (!data.title || !data.excerpt) return res.status(400).json({ error: 'Title and excerpt are required.' });
    res.json(await prisma.blogPost.update({ where: { id: +req.params.id }, data }));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e); res.status(500).json({ error: 'Could not update post.' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.blogPost.delete({ where: { id: +req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e); res.status(500).json({ error: 'Could not delete post.' });
  }
});

module.exports = router;
