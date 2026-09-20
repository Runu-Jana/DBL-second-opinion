// Contact Us — public submit (from the website form) + admin read/manage.
const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { requireAdmin, publicPatient, signPatient } = require('./auth');
const { logActivity } = require('../lib/audit');
const { sendContactNotification } = require('../lib/email');
const { notifyPatient, notifyCounsellors } = require('../lib/notify');
const { sendCode, otpChannel, otpTarget, otpConfigured, normalizePhone } = require('../lib/otp');

const router = express.Router();
const STATUSES = ['New', 'Read', 'Replied', 'Archived'];
const clean = (v) => (v && String(v).trim() ? String(v).trim() : '');
const looksEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ''));
const IS_PROD = process.env.NODE_ENV === 'production';

// --- OTP for the home-page registration pop-up ---
// The code goes out over whichever channel lib/otp.js is configured for (email, WhatsApp or
// SMS). Either way the lead is keyed by phone: that is the identity the Patient record uses and
// what the team calls back on, even when the code itself was emailed.
// Ephemeral, in-memory challenge store (short-lived codes; fine for a single instance).
const OTP_TTL_MS = 5 * 60 * 1000;      // code valid for 5 minutes
const OTP_MAX_ATTEMPTS = 5;            // wrong-code guesses before the code is burned
const OTP_RESEND_MS = 30 * 1000;      // cooldown between sends to one number
const otpStore = new Map();           // normalizedPhone -> { hash, name, email, expiresAt, attempts, lastSentAt }
const genOtp = () => String(Math.floor(100000 + Math.random() * 900000));   // 6-digit
const genUhid = () => 'DBL' + (100000 + Math.floor(Math.random() * 900000));

// GET  /api/contact/otp/channel -> { channel, target } so the form knows which field to require
router.get('/otp/channel', (_req, res) => res.json({ channel: otpChannel(), target: otpTarget() }));

// POST /api/contact/otp/send  { name, phone, email } -> sends a verification code
router.post('/otp/send', async (req, res) => {
  try {
    const b = req.body || {};
    const name = clean(b.name);
    const phone = normalizePhone(b.phone);
    const email = clean(b.email).toLowerCase();
    if (!name) return res.status(400).json({ error: 'Please enter your name.' });
    if (!phone || phone.length < 10) return res.status(400).json({ error: 'Please enter a valid phone number.' });
    if (otpTarget() === 'email' && !looksEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // In production a real sender is required — never hand out codes with nothing to send them over.
    if (!otpConfigured() && IS_PROD) {
      return res.status(503).json({ error: 'Verification is temporarily unavailable. Please use our contact form and our team will reach out.' });
    }

    const existing = otpStore.get(phone);
    if (existing && Date.now() - existing.lastSentAt < OTP_RESEND_MS) {
      const wait = Math.ceil((OTP_RESEND_MS - (Date.now() - existing.lastSentAt)) / 1000);
      return res.status(429).json({ error: `Please wait ${wait}s before requesting another code.` });
    }

    const code = genOtp();
    const hash = await bcrypt.hash(code, 8);
    otpStore.set(phone, { hash, name, email, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0, lastSentAt: Date.now() });

    let result;
    try { result = await sendCode({ to: otpTarget() === 'email' ? email : phone, name, code }); }
    catch (e) { console.error('otp send failed:', e.message); return res.status(502).json({ error: 'Could not send the code right now. Please try again shortly.' }); }

    // In DEV only (never production), return the code so the flow is testable without a live number.
    res.json({ ok: true, channel: result.channel, ...(result.dev && !IS_PROD ? { devCode: code } : {}) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not send the code. Please try again.' }); }
});

// POST /api/contact/otp/verify  { name, phone, code } -> verifies + registers the customer as a Patient
router.post('/otp/verify', async (req, res) => {
  try {
    const b = req.body || {};
    const phone = normalizePhone(b.phone);
    const code = clean(b.code);
    const rec = otpStore.get(phone);
    if (!rec) return res.status(400).json({ error: 'Please request a new code.' });
    if (Date.now() > rec.expiresAt) { otpStore.delete(phone); return res.status(400).json({ error: 'This code has expired. Please request a new one.' }); }
    if (rec.attempts >= OTP_MAX_ATTEMPTS) { otpStore.delete(phone); return res.status(429).json({ error: 'Too many attempts. Please request a new code.' }); }

    const ok = code && (await bcrypt.compare(code, rec.hash));
    if (!ok) { rec.attempts += 1; return res.status(401).json({ error: 'Incorrect code. Please try again.' }); }
    otpStore.delete(phone);

    // Verified — create the customer record (or claim an existing one with this phone).
    // The unique `uhid` is their code; future reports attach via Report.patientUhid.
    let patient = await prisma.patient.findFirst({ where: { phone } });
    if (!patient) {
      let uhid = genUhid();
      for (let i = 0; i < 5 && (await prisma.patient.findUnique({ where: { uhid } })); i++) uhid = genUhid();
      // Only the channel that actually carried the code counts as verified.
      const verified = otpTarget() === 'email' ? { emailVerified: true } : { phoneVerified: true };
      patient = await prisma.patient.create({ data: { name: rec.name, phone, email: rec.email || null, uhid, status: 'New Patient', ...verified } });
      // They have just handed us their details; say so, and tell intake there is a new lead.
      await notifyPatient(uhid, { kind: 'account', title: 'Welcome to DBL International',
        body: `Your details are verified. Upload your medical reports and our team will review them.`, link: '/dashboard/upload' });
      await notifyCounsellors({ kind: 'case', title: 'New patient registered',
        body: `${rec.name} registered and may upload reports shortly.`, link: null });
      logActivity(req, { kind: 'activity', actor: rec.name, action: `New verified customer (${otpChannel()} OTP)`, target: uhid, category: 'Patient' });
      sendContactNotification({ name: rec.name, email: rec.email || '', subject: 'New verified lead', message: `Verified via ${otpChannel()} OTP.
Phone: +${phone}
Email: ${rec.email || '(not given)'}
Code: ${uhid}` }).catch((e) => console.error('lead email failed:', e.message));
    } else {
      // Existing lead coming back — top up whatever we just proved, and any detail we lacked.
      const verified = otpTarget() === 'email' ? { emailVerified: true } : { phoneVerified: true };
      patient = await prisma.patient.update({
        where: { id: patient.id },
        data: { ...verified, name: patient.name || rec.name, email: patient.email || rec.email || null },
      });
    }

    // Hand back a session too. Without this the visitor is "registered" but still anonymous to
    // the app, so the first thing they are asked to do — upload a report — bounces them to a
    // login they have no password for.
    res.json({ ok: true, uhid: patient.uhid, name: patient.name, token: signPatient(patient), patient: publicPatient(patient) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not complete registration. Please try again.' }); }
});

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

// POST /api/contact/lead  (PUBLIC — the "Second Opinion" home-page pop-up: name + phone only)
router.post('/lead', async (req, res) => {
  try {
    const b = req.body || {};
    const name = clean(b.name), phone = clean(b.phone);
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone number are required.' });
    const created = await prisma.contactMessage.create({
      data: { name, email: '', subject: 'Second Opinion Lead', message: `Second-opinion request via website pop-up.\nPhone: ${phone}`, status: 'New' },
    });
    logActivity(req, { kind: 'activity', actor: name, action: 'New second-opinion lead (pop-up)', target: phone, category: 'Contact' });
    sendContactNotification({ name, email: '', subject: 'Second Opinion Lead', message: `Phone: ${phone}` }).catch((e) => console.error('lead email failed:', e.message));
    res.status(201).json({ ok: true, id: created.id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not submit. Please try again.' }); }
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
