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

    const [activity, contact, patientMsgs, contactUnread, msgUnread] = await Promise.all([
      prisma.activityLog.count({ where: { kind: 'activity', createdAt: { gt: aSince } } }),
      prisma.contactMessage.count({ where: { createdAt: { gt: mSince } } }),
      prisma.message.count({ where: { sender: 'patient', createdAt: { gt: mSince } } }),
      // Also report what is genuinely outstanding, which is a different question from "new".
      prisma.contactMessage.count({ where: { status: 'New' } }),
      prisma.message.count({ where: { sender: 'patient', readByCare: false } }),
    ]);

    res.json({
      activity,
      messages: contact + patientMsgs,
      outstanding: { contact: contactUnread, messages: msgUnread },
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load notification counts.' }); }
});

module.exports = router;
