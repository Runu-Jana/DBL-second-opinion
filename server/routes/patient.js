// Patient Portal API — a logged-in patient sees ONLY their own records (reports, appointments,
// consultations, invoices), scoped by their UHID/name. This is the read-back half of the
// upload → triage → doctor-review pipeline: the patient finally sees the status of what they sent.
const express = require('express');
const prisma = require('../db');
const { requirePatient, publicPatient } = require('./auth');
const { logActivity } = require('../lib/audit');

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

// GET /api/portal/consultations — the patient's second-opinion cases
router.get('/consultations', requirePatient, async (req, res) => {
  try {
    const list = await prisma.consultation.findMany({ where: safeWhere(req), orderBy: [{ updatedAt: 'desc' }] });
    res.json(list);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load your cases.' }); }
});

// GET /api/portal/invoices — the patient's bills
router.get('/invoices', requirePatient, async (req, res) => {
  try {
    const list = await prisma.invoice.findMany({ where: safeWhere(req), orderBy: [{ createdAt: 'desc' }] });
    res.json(list);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load your invoices.' }); }
});

module.exports = router;
