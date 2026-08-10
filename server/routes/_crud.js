// Generic admin CRUD router factory — powers the standard list/create/update/delete modules.
const express = require('express');
const prisma = require('../db');
const { requireAdmin } = require('./auth');
const { logCrud } = require('../lib/audit');

// helpers for parse functions
const str = (v) => (v !== undefined && v !== null && String(v).trim() !== '' ? String(v).trim() : null);
const int = (v, d = 0) => (Number.isFinite(+v) && v !== '' && v !== null ? Math.max(0, parseInt(v, 10)) : d);
const inSet = (v, set, d) => (set.includes(v) ? v : d);

function crudRouter({ model, parse, statuses = [], searchFields = [], orderBy = [{ updatedAt: 'desc' }], label }) {
  const router = express.Router();
  const M = () => prisma[model];
  const NOUN = label || (model.charAt(0).toUpperCase() + model.slice(1));
  const nameOf = (r) => (r && (r.patientName || r.name || r.title)) || (r && r.id != null ? `#${r.id}` : '');

  router.get('/', requireAdmin, async (req, res) => {
    try {
      const { q, status } = req.query;
      const where = {};
      if (status && statuses.includes(status)) where.status = status;
      if (q && searchFields.length) where.OR = searchFields.map((fld) => ({ [fld]: { contains: String(q), mode: 'insensitive' } }));
      res.json(await M().findMany({ where, orderBy }));
    } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load records.' }); }
  });

  router.get('/:id', requireAdmin, async (req, res) => {
    try { const r = await M().findUnique({ where: { id: +req.params.id } }); if (!r) return res.status(404).json({ error: 'Not found.' }); res.json(r); }
    catch (e) { console.error(e); res.status(500).json({ error: 'Could not load record.' }); }
  });

  router.post('/', requireAdmin, async (req, res) => {
    try {
      const { data, error } = parse(req.body);
      if (error) return res.status(400).json({ error });
      const created = await M().create({ data });
      logCrud(req, 'Created', NOUN, nameOf(created), { activity: true });
      res.status(201).json(created);
    } catch (e) {
      if (e.code === 'P2002') return res.status(400).json({ error: 'A record with that unique value already exists.' });
      console.error(e); res.status(500).json({ error: 'Could not create record.' });
    }
  });

  router.put('/:id', requireAdmin, async (req, res) => {
    try {
      const { data, error } = parse(req.body);
      if (error) return res.status(400).json({ error });
      const updated = await M().update({ where: { id: +req.params.id }, data });
      logCrud(req, 'Updated', NOUN, nameOf(updated));
      res.json(updated);
    } catch (e) {
      if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
      if (e.code === 'P2002') return res.status(400).json({ error: 'A record with that unique value already exists.' });
      console.error(e); res.status(500).json({ error: 'Could not update record.' });
    }
  });

  router.delete('/:id', requireAdmin, async (req, res) => {
    try {
      const deleted = await M().delete({ where: { id: +req.params.id } });
      logCrud(req, 'Deleted', NOUN, nameOf(deleted));
      res.json({ ok: true });
    } catch (e) {
      if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
      console.error(e); res.status(500).json({ error: 'Could not delete record.' });
    }
  });

  return router;
}

module.exports = { crudRouter, str, int, inSet };
