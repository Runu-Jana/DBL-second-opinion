// Care-team side of patient messaging. Admins/doctors see one conversation per patient and reply.
const express = require('express');
const prisma = require('../db');
const { requireAdmin } = require('./auth');
const { logActivity } = require('../lib/audit');

const router = express.Router();
const keyOf = (m) => (m.patientUhid || m.patientName || '').toLowerCase();

// GET /api/messages — conversation list (one row per patient, most-recent first, with unread count)
router.get('/', requireAdmin, async (_req, res) => {
  try {
    const all = await prisma.message.findMany({ orderBy: [{ createdAt: 'desc' }] });
    const convos = new Map();
    for (const m of all) {
      const k = keyOf(m);
      if (!k) continue;
      if (!convos.has(k)) convos.set(k, { patientUhid: m.patientUhid || null, patientName: m.patientName, last: m, unread: 0 });
      if (m.sender === 'patient' && !m.readByCare) convos.get(k).unread += 1;
    }
    res.json([...convos.values()].map((c) => ({
      patientUhid: c.patientUhid, patientName: c.patientName,
      lastBody: c.last.body, lastSender: c.last.sender, lastAt: c.last.createdAt, unread: c.unread,
    })));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load conversations.' }); }
});

// GET /api/messages/thread?uhid=&name= — one patient's full thread; marks their messages as read
router.get('/thread', requireAdmin, async (req, res) => {
  try {
    const uhid = req.query.uhid ? String(req.query.uhid) : null;
    const name = req.query.name ? String(req.query.name) : null;
    const where = { OR: [...(uhid ? [{ patientUhid: uhid }] : []), ...(name ? [{ patientName: { equals: name, mode: 'insensitive' } }] : [])] };
    if (!where.OR.length) return res.status(400).json({ error: 'Patient not specified.' });
    const list = await prisma.message.findMany({ where, orderBy: [{ createdAt: 'asc' }] });
    await prisma.message.updateMany({ where: { AND: [where, { sender: 'patient', readByCare: false }] }, data: { readByCare: true } });
    res.json(list);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load the conversation.' }); }
});

// POST /api/messages/reply — care team replies to a patient
router.post('/reply', requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const patientName = String(b.patientName || '').trim();
    const patientUhid = b.patientUhid ? String(b.patientUhid).trim() : null;
    const body = String(b.body || '').trim();
    if (!patientName || !body) return res.status(400).json({ error: 'Patient and message are required.' });
    const msg = await prisma.message.create({ data: { patientUhid, patientName, sender: 'care', body, readByCare: true, readByPatient: false } });
    logActivity(req, { kind: 'activity', action: `Replied to ${patientName}`, target: `Patient · ${patientName}`, category: 'Message' });
    res.status(201).json(msg);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not send the reply.' }); }
});

module.exports = router;
