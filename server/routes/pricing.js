// Pricing module — public GET, admin-protected writes (plans, settings, offers)
const express = require('express');
const prisma = require('../db');
const { requireAdmin } = require('./auth');

const router = express.Router();

const toFeatures = (v) => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string') return v.split('\n').map((x) => x.trim()).filter(Boolean);
  return [];
};

function parsePlan(body = {}) {
  return {
    name: String(body.name || '').trim(),
    tagline: body.tagline ? String(body.tagline).trim() : null,
    priceMonthly: Number.isFinite(+body.priceMonthly) ? Math.max(0, parseInt(body.priceMonthly, 10)) : 0,
    features: toFeatures(body.features),
    ctaLabel: body.ctaLabel ? String(body.ctaLabel).trim() : 'Choose Plan',
    featured: !!body.featured,
    active: body.active === undefined ? true : !!body.active,
    order: Number.isFinite(+body.order) ? parseInt(body.order, 10) : 0,
  };
}

function parseOffer(body = {}) {
  return {
    title: String(body.title || '').trim(),
    subtitle: body.subtitle ? String(body.subtitle).trim() : null,
    badge: body.badge ? String(body.badge).trim() : null,
    discountPct: Number.isFinite(+body.discountPct) ? Math.min(90, Math.max(0, parseInt(body.discountPct, 10))) : 0,
    active: !!body.active,
    order: Number.isFinite(+body.order) ? parseInt(body.order, 10) : 0,
  };
}

// Ensure the singleton settings row exists
async function getSettings() {
  return prisma.pricingSetting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

// GET /api/pricing (public) — active plans + active offers + settings
router.get('/', async (_req, res) => {
  try {
    const [settings, plans, offers] = await Promise.all([
      getSettings(),
      prisma.pricingPlan.findMany({ where: { active: true }, orderBy: [{ order: 'asc' }, { id: 'asc' }] }),
      prisma.offer.findMany({ where: { active: true }, orderBy: [{ order: 'asc' }, { id: 'asc' }] }),
    ]);
    res.json({ settings, plans, offers });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not load pricing.' });
  }
});

// GET /api/pricing/admin (admin) — everything, incl. hidden
router.get('/admin', requireAdmin, async (_req, res) => {
  try {
    const [settings, plans, offers] = await Promise.all([
      getSettings(),
      prisma.pricingPlan.findMany({ orderBy: [{ order: 'asc' }, { id: 'asc' }] }),
      prisma.offer.findMany({ orderBy: [{ order: 'asc' }, { id: 'asc' }] }),
    ]);
    res.json({ settings, plans, offers });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not load pricing.' });
  }
});

// PUT /api/pricing/settings (admin)
router.put('/settings', requireAdmin, async (req, res) => {
  try {
    const data = {
      currency: req.body.currency ? String(req.body.currency).trim() : 'INR',
      yearlyEnabled: req.body.yearlyEnabled === undefined ? true : !!req.body.yearlyEnabled,
      yearlyDiscountPct: Number.isFinite(+req.body.yearlyDiscountPct) ? Math.min(90, Math.max(0, parseInt(req.body.yearlyDiscountPct, 10))) : 20,
    };
    const settings = await prisma.pricingSetting.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
    res.json(settings);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not update settings.' });
  }
});

// ---- Plans CRUD ----
router.post('/plans', requireAdmin, async (req, res) => {
  try {
    const data = parsePlan(req.body);
    if (!data.name) return res.status(400).json({ error: 'Plan name is required.' });
    res.status(201).json(await prisma.pricingPlan.create({ data }));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not create plan.' }); }
});

router.put('/plans/:id', requireAdmin, async (req, res) => {
  try {
    const data = parsePlan(req.body);
    if (!data.name) return res.status(400).json({ error: 'Plan name is required.' });
    res.json(await prisma.pricingPlan.update({ where: { id: +req.params.id }, data }));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e); res.status(500).json({ error: 'Could not update plan.' });
  }
});

router.delete('/plans/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.pricingPlan.delete({ where: { id: +req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e); res.status(500).json({ error: 'Could not delete plan.' });
  }
});

// ---- Offers CRUD ----
router.post('/offers', requireAdmin, async (req, res) => {
  try {
    const data = parseOffer(req.body);
    if (!data.title) return res.status(400).json({ error: 'Offer title is required.' });
    res.status(201).json(await prisma.offer.create({ data }));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not create offer.' }); }
});

router.put('/offers/:id', requireAdmin, async (req, res) => {
  try {
    const data = parseOffer(req.body);
    if (!data.title) return res.status(400).json({ error: 'Offer title is required.' });
    res.json(await prisma.offer.update({ where: { id: +req.params.id }, data }));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e); res.status(500).json({ error: 'Could not update offer.' });
  }
});

router.delete('/offers/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.offer.delete({ where: { id: +req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e); res.status(500).json({ error: 'Could not delete offer.' });
  }
});

module.exports = router;
