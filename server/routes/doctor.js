// Doctor Portal API — a logged-in doctor sees ONLY their own patients & reports.
const express = require('express');
const prisma = require('../db');
const { requireDoctor } = require('./auth');
const { logActivity } = require('../lib/audit');
const { draftOpinion, configured: aiConfigured } = require('../lib/opinionAI');
const { sendOpinionReady } = require('../lib/email');

const router = express.Router();
const REPORT_STATUSES = ['Pending Review', 'Reviewed', 'Uploaded', 'Archived'];

// Every case route below goes through this. A specialist may only touch a case they were
// actually assigned — the id in the URL is never trusted on its own.
async function ownCase(req) {
  const uhid = String(req.params.uhid || '').trim();
  const kase = await prisma.secondOpinion.findFirst({ where: { patientUhid: uhid } });
  if (!kase || kase.expert !== req.doctor.name) return null;
  return kase;
}

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
      doctorOpinion: kase.doctorOpinion,
      doctorAiDraft: kase.doctorAiDraft,
      status: kase.status,
      deliveredAt: kase.deliveredAt,
      ai: aiConfigured(),
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load the case.' }); }
});

router.get('/patients', requireDoctor, async (req, res) => {
  try {
    const list = await prisma.patient.findMany({ where: { doctor: req.doctor.name }, orderBy: [{ updatedAt: 'desc' }] });
    res.json(list);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load your patients.' }); }
});

// POST /api/doctor/cases/:uhid/draft -> an AI first draft of the opinion, from the counsellor's
// assessment and the readings of the documents. Not saved as the opinion: the doctor edits it.
router.post('/cases/:uhid/draft', requireDoctor, async (req, res) => {
  try {
    const kase = await ownCase(req);
    if (!kase) return res.status(404).json({ error: 'Case not found.' });
    if (!aiConfigured()) return res.status(503).json({ error: 'AI drafting is not configured on this server.' });
    const documents = await prisma.report.findMany({ where: { patientUhid: kase.patientUhid } });
    const readings = documents.filter((d) => d.aiSummary);
    const draft = await draftOpinion({
      patientName: kase.patientName,
      cancerType: kase.cancerType,
      counsellorReport: kase.counsellorReport,
      readings,
    });
    const saved = await prisma.secondOpinion.update({ where: { id: kase.id }, data: { doctorAiDraft: draft } });
    res.json({ ok: true, draft, case: saved });
  } catch (e) {
    if (e.code === 'NO_AI') return res.status(503).json({ error: e.message });
    console.error(e);
    res.status(502).json({ error: 'The AI could not draft this right now.' });
  }
});

// PUT /api/doctor/cases/:uhid/opinion -> save the doctor's own text (draft state, not sent yet)
router.put('/cases/:uhid/opinion', requireDoctor, async (req, res) => {
  try {
    const kase = await ownCase(req);
    if (!kase) return res.status(404).json({ error: 'Case not found.' });
    const opinion = req.body.opinion == null ? '' : String(req.body.opinion).trim();
    const updated = await prisma.secondOpinion.update({
      where: { id: kase.id },
      data: { doctorOpinion: opinion || null, status: kase.status === 'Delivered' ? 'Delivered' : 'Under Review' },
    });
    res.json({ ok: true, case: updated });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not save your opinion.' }); }
});

// POST /api/doctor/cases/:uhid/deliver -> release it to the patient and tell them it is ready
router.post('/cases/:uhid/deliver', requireDoctor, async (req, res) => {
  try {
    const kase = await ownCase(req);
    if (!kase) return res.status(404).json({ error: 'Case not found.' });
    if (!kase.doctorOpinion) {
      return res.status(400).json({ error: 'Write and save your opinion before sending it to the patient.' });
    }
    const updated = await prisma.secondOpinion.update({
      where: { id: kase.id },
      data: { status: 'Delivered', deliveredAt: new Date(), summary: kase.doctorOpinion.slice(0, 500) },
    });
    // The reports this opinion came from are done with review.
    await prisma.report.updateMany({ where: { patientUhid: kase.patientUhid, doctor: req.doctor.name }, data: { status: 'Reviewed' } });

    const patient = await prisma.patient.findFirst({ where: { uhid: kase.patientUhid } });
    const origin = req.headers.origin || process.env.PUBLIC_URL || '';
    let emailed = false;
    if (patient && patient.email) {
      const r = await sendOpinionReady({
        to: patient.email, name: patient.name, doctor: req.doctor.name,
        url: `${origin}/dashboard/cases`,
      }).catch((e) => { console.error('opinion email failed:', e.message); return { skipped: true }; });
      emailed = !!(r && r.ok);
    }
    logActivity(req, { kind: 'audit', actor: req.doctor.name, action: `Second opinion delivered to ${kase.patientName}`, target: kase.patientUhid, category: 'Report' });
    res.json({ ok: true, case: updated, emailed });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not send the opinion.' }); }
});

module.exports = router;
