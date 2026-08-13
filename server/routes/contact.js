// Contact Us — public submit (from the website form) + admin read/manage.
const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { requireAdmin } = require('./auth');
const { logActivity } = require('../lib/audit');
const { sendContactNotification } = require('../lib/email');
const { sendOtp, normalizePhone, whatsappConfigured } = require('../lib/whatsapp');

const router = express.Router();
const STATUSES = ['New', 'Read', 'Replied', 'Archived'];
const clean = (v) => (v && String(v).trim() ? String(v).trim() : '');
const IS_PROD = process.env.NODE_ENV === 'production';

// --- Phone OTP (WhatsApp) for the home-page registration pop-up ---
// Ephemeral, in-memory challenge store (short-lived codes; fine for a single instance).
const OTP_TTL_MS = 5 * 60 * 1000;      // code valid for 5 minutes
const OTP_MAX_ATTEMPTS = 5;            // wrong-code guesses before the code is burned
const OTP_RESEND_MS = 30 * 1000;      // cooldown between sends to one number
const otpStore = new Map();           // normalizedPhone -> { hash, name, expiresAt, attempts, lastSentAt }
const genOtp = () => String(Math.floor(100000 + Math.random() * 900000));   // 6-digit
const genUhid = () => 'DBL' + (100000 + Math.floor(Math.random() * 900000));

// POST /api/contact/otp/send  { name, phone } -> sends a WhatsApp verification code
router.post('/otp/send', async (req, res) => {
  try {
    const b = req.body || {};
    const name = clean(b.name);
    const phone = normalizePhone(b.phone);
    if (!name) return res.status(400).json({ error: 'Please enter your name.' });
    if (!phone || phone.length < 10) return res.status(400).json({ error: 'Please enter a valid phone number.' });

    // In production we must have a real WhatsApp sender — never hand out codes without one.
    if (!whatsappConfigured() && IS_PROD) {
      return res.status(503).json({ error: 'Phone verification is temporarily unavailable. Please use our contact form and our team will reach out.' });
    }

    const existing = otpStore.get(phone);
    if (existing && Date.now() - existing.lastSentAt < OTP_RESEND_MS) {
      const wait = Math.ceil((OTP_RESEND_MS - (Date.now() - existing.lastSentAt)) / 1000);
      return res.status(429).json({ error: `Please wait ${wait}s before requesting another code.` });
    }

    const code = genOtp();
    const hash = await bcrypt.hash(code, 8);
    otpStore.set(phone, { hash, name, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0, lastSentAt: Date.now() });

    let result;
    try { result = await sendOtp(phone, code); }
    catch (e) { console.error('whatsapp otp send failed:', e.message); return res.status(502).json({ error: 'Could not send the code right now. Please try again shortly.' }); }

    // In DEV only (never production), return the code so the flow is testable without a live number.
    res.json({ ok: true, ...(result.dev && !IS_PROD ? { devCode: code } : {}) });
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
      patient = await prisma.patient.create({ data: { name: rec.name, phone, uhid, status: 'New Patient', phoneVerified: true } });
      logActivity(req, { kind: 'activity', actor: rec.name, action: 'New verified customer (WhatsApp OTP)', target: uhid, category: 'Patient' });
      sendContactNotification({ name: rec.name, email: '', subject: 'New verified lead', message: `Verified via WhatsApp OTP.\nPhone: +${phone}\nCode: ${uhid}` }).catch((e) => console.error('lead email failed:', e.message));
    } else if (!patient.phoneVerified) {
      patient = await prisma.patient.update({ where: { id: patient.id }, data: { phoneVerified: true, name: patient.name || rec.name } });
    }

    res.json({ ok: true, uhid: patient.uhid, name: patient.name });
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
