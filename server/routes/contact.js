// Contact Us — public submit (from the website form) + admin read/manage.
const express = require('express');
const prisma = require('../db');
const { requireAdmin } = require('./auth');
const { logActivity } = require('../lib/audit');
const { sendContactNotification } = require('../lib/email');

const router = express.Router();
const STATUSES = ['New', 'Read', 'Replied', 'Archived'];
const clean = (v) => (v && String(v).trim() ? String(v).trim() : '');

// POST /api/contact  (PUBLIC — the Contact Us form) -> stores the message + notifies admins live
router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const name = clean(b.name), email = clean(b.email), message = clean(b.message);
    const subject = clean(b.subject) || 'General Inquiry';
    if (!name || !email || !message) return res.status(400).json({ error: 'Name, email and message are required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

    const created = await prisma.contactMessage.create({ data: { name, email, subject, message, status: 'New' } });
    logActivity(req, { kind: 'activity', actor: name, action: `New contact message: ${subject}`, target: email, category: 'Contact' });
    // Email the team (best-effort — never block or fail the submission on an email hiccup).
    sendContactNotification({ name, email, subject, message }).catch((e) => console.error('contact email failed:', e.message));
    res.status(201).json({ ok: true, id: created.id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not send your message. Please try again.' }); }
});

// GET /api/contact  (admin) — ?status, ?q
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { q, status } = req.query;
    const where = {};
    if (status && STATUSES.includes(status)) where.status = status;
    if (q) where.OR = [
      { name: { contains: String(q), mode: 'insensitive' } },
      { email: { contains: String(q), mode: 'insensitive' } },
      { subject: { contains: String(q), mode: 'insensitive' } },
      { message: { contains: String(q), mode: 'insensitive' } },
    ];
    res.json(await prisma.contactMessage.findMany({ where, orderBy: [{ createdAt: 'desc' }] }));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load messages.' }); }
});

// PUT /api/contact/:id  (admin) — update status
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const data = {};
    if (STATUSES.includes(req.body.status)) data.status = req.body.status;
    const updated = await prisma.contactMessage.update({ where: { id: +req.params.id }, data });
    if (data.status) logActivity(req, { kind: 'audit', action: `Contact message marked ${data.status}`, target: updated.email, category: 'Contact' });
    res.json(updated);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e); res.status(500).json({ error: 'Could not update the message.' });
  }
});

// DELETE /api/contact/:id  (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await prisma.contactMessage.delete({ where: { id: +req.params.id } });
    logActivity(req, { kind: 'audit', action: 'Deleted contact message', target: deleted.email, category: 'Contact' });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e); res.status(500).json({ error: 'Could not delete the message.' });
  }
});

module.exports = router;
