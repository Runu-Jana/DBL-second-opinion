// Doctor Portal API — a logged-in doctor sees ONLY their own patients & reports.
const express = require('express');
const prisma = require('../db');
const { requireDoctor } = require('./auth');
const { logActivity } = require('../lib/audit');

const router = express.Router();
const REPORT_STATUSES = ['Pending Review', 'Reviewed', 'Uploaded', 'Archived'];

// GET /api/doctor/me -> profile + quick counts
router.get('/me', requireDoctor, async (req, res) => {
  try {
    const name = req.doctor.name;
    const [patients, pending, total] = await Promise.all([
      prisma.patient.count({ where: { doctor: name } }),
      prisma.report.count({ where: { doctor: name, status: 'Pending Review' } }),
      prisma.report.count({ where: { doctor: name } }),
    ]);
    res.json({ doctor: req.doctor, stats: { patients, pendingReports: pending, totalReports: total } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load your profile.' }); }
});

// GET /api/doctor/reports  (?status=) -> only this doctor's reports
router.get('/reports', requireDoctor, async (req, res) => {
  try {
    const where = { doctor: req.doctor.name };
    if (req.query.status && REPORT_STATUSES.includes(req.query.status)) where.status = req.query.status;
    const list = await prisma.report.findMany({ where, orderBy: [{ updatedAt: 'desc' }] });
    res.json(list);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load your reports.' }); }
});

// PUT /api/doctor/reports/:id  -> update status/notes on one of THEIR reports only
router.put('/reports/:id', requireDoctor, async (req, res) => {
  try {
    const report = await prisma.report.findUnique({ where: { id: +req.params.id } });
    if (!report || report.doctor !== req.doctor.name) return res.status(404).json({ error: 'Report not found.' });
    const data = {};
    if (REPORT_STATUSES.includes(req.body.status)) data.status = req.body.status;
    if (req.body.notes !== undefined) data.notes = req.body.notes ? String(req.body.notes).trim() : null;
    const updated = await prisma.report.update({ where: { id: report.id }, data });
    if (data.status) {
      logActivity(req, { kind: 'audit', action: `Report marked ${data.status}`, target: `Report · ${updated.patientName}`, category: 'Report' });
      logActivity(req, { kind: 'activity', action: `${req.doctor.name} marked ${updated.patientName}'s report ${data.status}`, category: 'Report' });
    }
    res.json(updated);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not update the report.' }); }
});

// GET /api/doctor/patients -> only this doctor's patients
// GET /api/doctor/cases/:uhid -> the counsellor's handover for one of THEIR patients:
// the assessment they wrote, plus every document the patient uploaded. A specialist should
// not have to hunt for the reasoning behind an assignment.
router.get('/cases/:uhid', requireDoctor, async (req, res) => {
  try {
    const uhid = String(req.params.uhid || '').trim();
    const kase = await prisma.secondOpinion.findFirst({ where: { patientUhid: uhid } });
    if (!kase || kase.expert !== req.doctor.name) return res.status(404).json({ error: 'Case not found.' });
    const [patient, documents] = await Promise.all([
      prisma.patient.findFirst({ where: { uhid } }),
      prisma.report.findMany({ where: { patientUhid: uhid, doctor: req.doctor.name }, orderBy: [{ createdAt: 'desc' }] }),
    ]);
    res.json({
      patient,
      documents,
      counsellor: kase.counsellor,
      counsellorReport: kase.counsellorReport,
      cancerType: kase.cancerType,
      priority: kase.priority,
      assignedAt: kase.assignedAt,
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load the case.' }); }
});

router.get('/patients', requireDoctor, async (req, res) => {
  try {
    const list = await prisma.patient.findMany({ where: { doctor: req.doctor.name }, orderBy: [{ updatedAt: 'desc' }] });
    res.json(list);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load your patients.' }); }
});

module.exports = router;
