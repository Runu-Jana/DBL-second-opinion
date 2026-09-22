// Counts behind the admin topbar badges.
//
// These were hardcoded to 12 and 8, so they never moved — opening a panel could not clear a
// number that was never counted in the first place. They now answer the question a notification
// badge is actually asking: what has arrived since I last looked here?
//
// "Last looked" is sent by the client, which keeps it per-person and per-browser. A shared
// server-side timestamp would let one admin clear another admin's badge, which is worse than
// the badge resetting when someone switches machine.
const express = require('express');
const prisma = require('../db');
const { requireAdmin } = require('./auth');

const router = express.Router();

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Every panel reads its own feed from one place. Rather than four near-identical routes, the
// token says who is asking: patients are addressed by UHID, staff by name.
function whoAmI(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated.' });
  try {
    const p = jwt.verify(token, JWT_SECRET);
    if (p.purpose) return res.status(403).json({ error: 'Not a session token.' });
    const audience = p.role === 'patient' ? 'patient'
      : p.role === 'doctor' ? 'doctor'
      : p.role === 'counsellor' ? 'counsellor'
      : 'admin';
    const recipient = audience === 'patient' ? p.uhid : p.name;
    if (!recipient) return res.status(400).json({ error: 'This account has no notification address yet.' });
    req.who = { audience, recipient };
    next();
  } catch { res.status(401).json({ error: 'Session expired. Please log in again.' }); }
}

// GET /api/notifications/mine -> this person's feed, newest first
router.get('/mine', whoAmI, async (req, res) => {
  try {
    const list = await prisma.notification.findMany({
      where: req.who,
      orderBy: [{ createdAt: 'desc' }],
      take: 50,
    });
    res.json({ unread: list.filter((n) => !n.readAt).length, items: list });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load notifications.' }); }
});

// POST /api/notifications/mine/read  { id? } -> mark one, or all, as read
router.post('/mine/read', whoAmI, async (req, res) => {
  try {
    const id = Number((req.body || {}).id);
    const where = { ...req.who, readAt: null, ...(Number.isInteger(id) && id > 0 ? { id } : {}) };
    const r = await prisma.notification.updateMany({ where, data: { readAt: new Date() } });
    res.json({ ok: true, marked: r.count });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not update notifications.' }); }
});


// An unparseable or missing timestamp means "never looked" — count everything.
function since(value) {
  if (!value) return new Date(0);
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

// GET /api/notifications?activitySince=<iso>&messagesSince=<iso>
router.get('/', requireAdmin, async (req, res) => {
  try {
    const aSince = since(req.query.activitySince);
    const mSince = since(req.query.messagesSince);

    const [activity, contact, patientMsgs, contactUnread, msgUnread,
      consultations, applications, untriaged, opinionsPending] = await Promise.all([
      prisma.activityLog.count({ where: { kind: 'activity', createdAt: { gt: aSince } } }),
      prisma.contactMessage.count({ where: { createdAt: { gt: mSince } } }),
      prisma.message.count({ where: { sender: 'patient', createdAt: { gt: mSince } } }),
      // Also report what is genuinely outstanding, which is a different question from "new".
      prisma.contactMessage.count({ where: { status: 'New' } }),
      prisma.message.count({ where: { sender: 'patient', readByCare: false } }),
      // Sidebar queues. These are work outstanding, not "new since you looked": the number
      // should fall when the work is done, not when someone glances at the tab.
      prisma.consultation.count({ where: { status: { in: ['Pending', 'In Review'] } } }),
      prisma.doctorApplication.count({ where: { status: 'Pending' } }),
      prisma.report.count({ where: { category: null } }),
      // Opinions a doctor has submitted and that are waiting for an admin to review and send.
      prisma.secondOpinion.count({ where: { status: 'Pending Approval' } }),
    ]);

    res.json({
      activity,
      messages: contact + patientMsgs,
      outstanding: { contact: contactUnread, messages: msgUnread },
      queues: { consultations, applications, reports: untriaged, opinions: opinionsPending },
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load notification counts.' }); }
});

module.exports = router;
