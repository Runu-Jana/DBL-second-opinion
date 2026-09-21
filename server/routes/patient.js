// Patient Portal API — a logged-in patient sees ONLY their own records (reports, appointments,
// consultations, invoices), scoped by their UHID/name. This is the read-back half of the
// upload → triage → doctor-review pipeline: the patient finally sees the status of what they sent.
const express = require('express');
const prisma = require('../db');
const { requirePatient, publicPatient } = require('./auth');
const { logActivity } = require('../lib/audit');
const bcrypt = require('bcryptjs');
const { notifyDoctor } = require('../lib/notify');

const router = express.Router();

// Records link to a patient by patientUhid (preferred) or patientName (fallback).
const mineWhere = (req) => ({
  OR: [
    ...(req.patient.uhid ? [{ patientUhid: req.patient.uhid }] : []),
    ...(req.patient.name ? [{ patientName: { equals: req.patient.name, mode: 'insensitive' } }] : []),
  ],
});
const safeWhere = (req) => (mineWhere(req).OR.length ? mineWhere(req) : { id: -1 }); // no match → return nothing

// GET /api/portal/me — profile + quick counts for the dashboard
router.get('/me', requirePatient, async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { id: req.patient.id } });
    if (!patient) return res.status(404).json({ error: 'Account not found.' });
    const where = safeWhere(req);
    const [reports, pending, appts, cases] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.count({ where: { AND: [where, { status: 'Pending Review' }] } }),
      prisma.appointment.count({ where }),
      prisma.consultation.count({ where }),
    ]);
    res.json({ patient: publicPatient(patient), stats: { reports, pendingReports: pending, appointments: appts, cases } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load your profile.' }); }
});

// PUT /api/portal/me — patient edits their own safe profile fields (persists to the real Patient row)
router.put('/me', requirePatient, async (req, res) => {
  try {
    const b = req.body || {};
    const str = (v) => (v !== undefined && v !== null && String(v).trim() !== '' ? String(v).trim() : null);
    const data = {
      name: str(b.name) || req.patient.name,
      phone: str(b.phone),
      city: str(b.city),
      gender: str(b.gender),
      age: Number.isFinite(+b.age) && b.age !== '' && b.age !== null ? parseInt(b.age, 10) : null,
    };
    const updated = await prisma.patient.update({ where: { id: req.patient.id }, data });
    logActivity(null, { kind: 'audit', actor: updated.name, action: 'Updated own profile', target: `Patient · ${updated.name}`, category: 'Patient' });
    res.json({ patient: publicPatient(updated) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not save your profile.' }); }
});

// PUT /api/portal/password { password, current? } — set or change the patient's own password.
// A patient who registered through the OTP pop-up has an account and no password at all;
// setting one here is what lets them sign in from another device without the reset email.
// Once a password exists the current one must be given to change it, so a session left open
// on a shared machine cannot be used to lock the real owner out.
router.put('/password', requirePatient, async (req, res) => {
  try {
    const password = String(req.body?.password ?? '');
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    const patient = await prisma.patient.findUnique({ where: { id: req.patient.id } });
    if (!patient) return res.status(404).json({ error: 'Account not found.' });
    if (!patient.email) return res.status(400).json({ error: 'Add an email address to your profile first — that is what you sign in with.' });
    if (patient.password) {
      const current = String(req.body?.current ?? '');
      const ok = current && await bcrypt.compare(current, patient.password);
      if (!ok) return res.status(400).json({ error: 'Your current password is incorrect.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const updated = await prisma.patient.update({ where: { id: patient.id }, data: { password: hash } });
    logActivity(null, { kind: 'audit', actor: updated.name, action: patient.password ? 'Changed own password' : 'Set a password', target: `Patient · ${updated.name}`, category: 'Patient' });
    res.json({ ok: true, patient: publicPatient(updated) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not save your password.' }); }
});

// GET /api/portal/reports — the patient's uploaded reports + their live status/category/assigned doctor
router.get('/reports', requirePatient, async (req, res) => {
  try {
    const list = await prisma.report.findMany({ where: safeWhere(req), orderBy: [{ createdAt: 'desc' }] });
    res.json(list);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load your reports.' }); }
});

// GET /api/portal/appointments
router.get('/appointments', requirePatient, async (req, res) => {
  try {
    const list = await prisma.appointment.findMany({ where: safeWhere(req), orderBy: [{ updatedAt: 'desc' }] });
    res.json(list);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load your appointments.' }); }
});

// POST /api/portal/appointments — patient requests an appointment (lands as "Pending" for the
// clinic to confirm). Patient identity comes from the token, never the client.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
router.post('/appointments', requirePatient, async (req, res) => {
  try {
    const b = req.body || {};
    const str = (v) => (v !== undefined && v !== null && String(v).trim() !== '' ? String(v).trim() : null);

    // Date: accept an ISO yyyy-mm-dd, reject empty/invalid/past, store as a friendly display string.
    const iso = str(b.date);
    if (!iso) return res.status(400).json({ error: 'Please choose a date.' });
    const d = new Date(iso + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'That date is not valid.' });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (d < today) return res.status(400).json({ error: 'Please choose a date in the future.' });
    const date = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

    const time = str(b.time);
    if (!time) return res.status(400).json({ error: 'Please choose a time.' });

    const mode = ['In-person', 'Video'].includes(b.mode) ? b.mode : 'Video';
    const type = str(b.type) || 'Second Opinion Consultation';
    const doctor = str(b.doctor); // optional — null means "assign a specialist"
    const reason = str(b.reason);

    const created = await prisma.appointment.create({
      data: {
        patientName: req.patient.name,
        patientUhid: req.patient.uhid || null,
        doctor, type, date, time, mode,
        status: 'Pending',
        notes: reason ? `Patient request: ${reason}` : 'Requested via patient portal',
      },
    });
    logActivity(null, { kind: 'activity', actor: req.patient.name, action: `Requested a ${mode.toLowerCase()} appointment on ${date}${doctor ? ` with ${doctor}` : ''}`, target: `Patient · ${req.patient.name}`, category: 'Appointment' });
    res.status(201).json(created);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not book your appointment. Please try again.' }); }
});

// GET /api/portal/consultations — the patient's second-opinion cases
router.get('/consultations', requirePatient, async (req, res) => {
  try {
    const list = await prisma.consultation.findMany({ where: safeWhere(req), orderBy: [{ updatedAt: 'desc' }] });
    res.json(list);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load your cases.' }); }
});

// GET /api/portal/cases — the patient's cases, one entry per case rather than per file.
//
// Uploading three files used to produce three "cases" on this screen, which reads as three
// separate reviews when it is one. The documents are grouped under the case they belong to.
router.get('/cases', requirePatient, async (req, res) => {
  try {
    const [documents, opinions] = await Promise.all([
      prisma.report.findMany({ where: safeWhere(req), orderBy: [{ createdAt: 'desc' }] }),
      prisma.secondOpinion.findMany({ where: safeWhere(req) }),
    ]);
    const doc = (d) => ({
      id: d.id, type: d.type, date: d.date, status: d.status,
      category: d.category, fileUrl: d.fileUrl, doctor: d.doctor,
    });

    if (opinions.length) {
      // Documents follow the specialist the case was assigned to; anything not yet assigned
      // belongs to the earliest case, which is the one still being worked on.
      return res.json(opinions.map((o, idx) => {
        const mine = documents.filter((d) => (o.expert && d.doctor === o.expert) || (!d.doctor && idx === 0));
        return {
          id: o.id,
          reference: o.patientUhid || `DBL-${String(o.id).padStart(4, '0')}`,
          cancerType: o.cancerType,
          patientQuestions: o.patientQuestions,
          doctor: o.expert,
          status: o.status,
          delivered: o.status === 'Delivered',
          submittedDate: o.submittedDate,
          deliveredAt: o.deliveredAt,
          documents: mine.map(doc),
        };
      }));
    }

    // Nothing triaged yet: still one case, not one per file.
    if (!documents.length) return res.json([]);
    res.json([{
      id: 0,
      reference: req.patient.uhid || 'Pending',
      cancerType: documents.find((d) => d.category)?.category || null,
      doctor: documents.find((d) => d.doctor)?.doctor || null,
      status: 'Awaiting Review',
      delivered: false,
      submittedDate: documents[documents.length - 1].date,
      deliveredAt: null,
      documents: documents.map(doc),
    }]);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load your cases.' }); }
});

// GET /api/portal/opinions — second opinions written for this patient.
// Only delivered ones: a draft the specialist is still working on is not the patient's to read,
// and the counsellor's internal assessment is never exposed here at all.
router.get('/opinions', requirePatient, async (req, res) => {
  try {
    const list = await prisma.secondOpinion.findMany({
      where: { AND: [safeWhere(req), { status: 'Delivered' }] },
      orderBy: [{ deliveredAt: 'desc' }],
    });
    res.json(list.map((o) => ({
      id: o.id,
      cancerType: o.cancerType,
      doctor: o.expert,
      opinion: o.doctorOpinion,
      // Shown back beside the answer, so they can check each one was addressed.
      patientQuestions: o.patientQuestions,
      deliveredAt: o.deliveredAt,
      submittedDate: o.submittedDate,
    })));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load your opinions.' }); }
});

// GET /api/portal/invoices — the patient's bills
router.get('/invoices', requirePatient, async (req, res) => {
  try {
    const list = await prisma.invoice.findMany({ where: safeWhere(req), orderBy: [{ createdAt: 'desc' }] });
    res.json(list);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load your invoices.' }); }
});

// GET /api/portal/messages — this patient's conversation with the care team (oldest first)
router.get('/messages', requirePatient, async (req, res) => {
  try {
    const where = safeWhere(req);
    const list = await prisma.message.findMany({ where, orderBy: [{ createdAt: 'asc' }] });
    // mark care -> patient messages as read now that the patient is viewing them
    await prisma.message.updateMany({ where: { AND: [where, { sender: 'care', readByPatient: false }] }, data: { readByPatient: true } });
    res.json(list);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load your messages.' }); }
});

// POST /api/portal/messages — patient sends a message to the care team
router.post('/messages', requirePatient, async (req, res) => {
  try {
    const body = String((req.body || {}).body || '').trim();
    if (!body) return res.status(400).json({ error: 'Message cannot be empty.' });
    if (body.length > 4000) return res.status(400).json({ error: 'Message is too long.' });
    const msg = await prisma.message.create({
      data: { patientUhid: req.patient.uhid || null, patientName: req.patient.name, sender: 'patient', body, readByCare: false, readByPatient: true },
    });
    // If they have a specialist, the message is almost always for them.
    const mine = await prisma.patient.findFirst({ where: { uhid: req.patient.uhid || undefined } }).catch(() => null);
    if (mine && mine.doctor) {
      await notifyDoctor(mine.doctor, { kind: 'message', title: `New message from ${req.patient.name}`,
        body: body.length > 120 ? body.slice(0, 117) + '…' : body, link: null });
    }
    logActivity(null, { kind: 'activity', actor: req.patient.name, action: 'Sent a message to the care team', target: `Patient · ${req.patient.name}`, category: 'Message' });
    res.status(201).json(msg);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not send your message.' }); }
});

module.exports = router;
