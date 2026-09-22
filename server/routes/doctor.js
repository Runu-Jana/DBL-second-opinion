// Doctor Portal API — a logged-in doctor sees ONLY their own patients & reports.
const express = require('express');
const prisma = require('../db');
const { requireDoctor } = require('./auth');
const { logActivity } = require('../lib/audit');
const { draftOpinion, configured: aiConfigured } = require('../lib/opinionAI');
const { analyzeReport } = require('../lib/reportAI');
const { sendOpinionReady } = require('../lib/email');
const { notifyPatient, notifyCounsellor } = require('../lib/notify');

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
// GET /api/doctor/cases -> the work list, one entry per PATIENT.
//
// A patient who uploads a scan, a discharge summary and a photo creates three Report rows,
// and listing those directly showed the same person three times as if they were three
// separate jobs. A case is the unit of work here, so the rows are grouped by patient and the
// files are counted rather than enumerated.
router.get('/cases', requireDoctor, async (req, res) => {
  try {
    const mine = await prisma.report.findMany({
      where: { doctor: req.doctor.name },
      orderBy: [{ updatedAt: 'desc' }],
    });
    const uhids = [...new Set(mine.map((r) => r.patientUhid).filter(Boolean))];
    const cases = uhids.length
      ? await prisma.secondOpinion.findMany({ where: { patientUhid: { in: uhids } } })
      : [];

    const byPatient = new Map();
    for (const r of mine) {
      const key = r.patientUhid || `name:${(r.patientName || '').toLowerCase()}`;
      if (!byPatient.has(key)) {
        byPatient.set(key, {
          key,
          uhid: r.patientUhid || null,
          patientName: r.patientName,
          documents: 0,
          pending: 0,
          category: r.category || null,
          lastUpdated: r.updatedAt,
          types: [],
        });
      }
      const c = byPatient.get(key);
      c.documents += 1;
      if (r.status === 'Pending Review') c.pending += 1;
      if (!c.category && r.category) c.category = r.category;
      if (r.type && !c.types.includes(r.type)) c.types.push(r.type);
      if (r.updatedAt > c.lastUpdated) c.lastUpdated = r.updatedAt;
    }

    const list = [...byPatient.values()].map((c) => {
      const kase = cases.find((k) => k.patientUhid && k.patientUhid === c.uhid) || null;
      return {
        ...c,
        priority: kase ? kase.priority : null,
        caseStatus: kase ? kase.status : null,
        counsellor: kase ? kase.counsellor : null,
        hasOpinion: !!(kase && kase.doctorOpinion),
        delivered: !!(kase && kase.status === 'Delivered'),
      };
    });
    list.sort((a, b) => (b.pending - a.pending) || (new Date(b.lastUpdated) - new Date(a.lastUpdated)));
    res.json(list);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load your cases.' }); }
});

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
    // Opening the case is the moment review actually starts. Stamped once, so the patient is
    // told when it begins rather than every time the specialist revisits the page. An admin
    // preview must not trigger it — the patient should not hear "review started" from a look.
    if (!req.doctor.imp) {
      // First open stamps when review began (kept for the record).
      if (!kase.reviewStartedAt) {
        await prisma.secondOpinion.update({ where: { id: kase.id }, data: { reviewStartedAt: new Date() } }).catch(() => {});
      }
      // Reviewing a case is seeing its documents. Mark this doctor's still-pending reports reviewed
      // — that clears them from "reports pending review" and from the case's "new" badge — and tell
      // the patient once, when reports actually move from pending to reviewed. The opinion is a
      // separate step: the case stays in the review queue until the opinion is sent.
      const marked = await prisma.report.updateMany({
        where: { patientUhid: uhid, doctor: req.doctor.name, status: 'Pending Review' },
        data: { status: 'Reviewed' },
      }).catch(() => ({ count: 0 }));
      if (marked.count > 0) {
        documents.forEach((d) => { if (d.status === 'Pending Review') d.status = 'Reviewed'; });
        await notifyPatient(uhid, { kind: 'case', title: 'Your reports have been reviewed',
          body: `${req.doctor.name} has reviewed your ${marked.count === 1 ? 'report' : 'reports'} and is preparing your second opinion.`, link: '/dashboard/cases' });
      }
    }
    res.json({
      patient,
      documents,
      counsellor: kase.counsellor,
      patientQuestions: kase.patientQuestions,
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
      patientQuestions: kase.patientQuestions,
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
        url: `${origin}/dashboard/opinion`,
      }).catch((e) => { console.error('opinion email failed:', e.message); return { skipped: true }; });
      emailed = !!(r && r.ok);
    }
    await notifyPatient(kase.patientUhid, { kind: 'report', title: 'Your second opinion is ready',
      body: `${req.doctor.name} has completed your review. Tap to read it.`, link: '/dashboard/opinion' });
    if (kase.counsellor) {
      await notifyCounsellor(kase.counsellor, { kind: 'case', title: 'Opinion delivered',
        body: `${req.doctor.name} sent the opinion for ${kase.patientName}.`, link: null });
    }
    logActivity(req, { kind: 'audit', actor: req.doctor.name, action: `Second opinion delivered to ${kase.patientName}`, target: kase.patientUhid, category: 'Report' });
    res.json({ ok: true, case: updated, emailed });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not send the opinion.' }); }
});

// POST /api/doctor/documents/:id/analyse -> AI reading of one document on their own case.
// The counsellor may already have run this; a specialist re-reading a scan themselves, or
// reading one that arrived after triage, should not have to ask them to do it.
router.post('/documents/:id/analyse', requireDoctor, async (req, res) => {
  try {
    const report = await prisma.report.findUnique({ where: { id: +req.params.id } });
    if (!report || report.doctor !== req.doctor.name) return res.status(404).json({ error: 'Document not found.' });
    if (!aiConfigured()) return res.status(503).json({ error: 'AI is not configured on this server.' });
    const summary = await analyzeReport(report);
    const saved = await prisma.report.update({ where: { id: report.id }, data: { aiSummary: summary } });
    res.json({ ok: true, aiSummary: saved.aiSummary });
  } catch (e) {
    if (e.code === 'UNSUPPORTED' || e.code === 'NO_FILE' || e.code === 'NO_AI') return res.status(400).json({ error: e.message });
    console.error(e);
    res.status(502).json({ error: 'The AI could not read this document right now.' });
  }
});

// PUT /api/doctor/documents/:id/note -> the doctor's own note on one document, written by hand.
router.put('/documents/:id/note', requireDoctor, async (req, res) => {
  try {
    const report = await prisma.report.findUnique({ where: { id: +req.params.id } });
    if (!report || report.doctor !== req.doctor.name) return res.status(404).json({ error: 'Document not found.' });
    const note = req.body.note == null ? '' : String(req.body.note).trim();
    const saved = await prisma.report.update({ where: { id: report.id }, data: { notes: note || null } });
    res.json({ ok: true, notes: saved.notes });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not save your note.' }); }
});

// Messages between a specialist and one of THEIR patients.
//
// One thread per patient rather than a separate doctor-only channel: the patient should not
// have to work out which of two inboxes to write in, and the care team needs to see what was
// said. Each message records its author, so "Dr Jack" and "Care team" are distinguishable.
router.get('/messages/:uhid', requireDoctor, async (req, res) => {
  try {
    const uhid = String(req.params.uhid || '').trim();
    const patient = await prisma.patient.findFirst({ where: { uhid, doctor: req.doctor.name } });
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });
    const list = await prisma.message.findMany({ where: { patientUhid: uhid }, orderBy: [{ createdAt: 'asc' }] });
    // Opening the thread is reading it — but an admin preview reading it must not mark the
    // patient's messages read on the doctor's behalf.
    if (!req.doctor.imp) {
      await prisma.message.updateMany({ where: { patientUhid: uhid, sender: 'patient', readByCare: false }, data: { readByCare: true } });
    }
    res.json({ patient: { name: patient.name, uhid: patient.uhid }, messages: list });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load the conversation.' }); }
});

router.post('/messages/:uhid', requireDoctor, async (req, res) => {
  try {
    const uhid = String(req.params.uhid || '').trim();
    const patient = await prisma.patient.findFirst({ where: { uhid, doctor: req.doctor.name } });
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });
    const body = String((req.body || {}).body || '').trim();
    if (!body) return res.status(400).json({ error: 'Message cannot be empty.' });
    if (body.length > 4000) return res.status(400).json({ error: 'Message is too long.' });
    const msg = await prisma.message.create({
      data: { patientUhid: uhid, patientName: patient.name, sender: 'care', author: req.doctor.name, body, readByCare: true, readByPatient: false },
    });
    await notifyPatient(uhid, { kind: 'message', title: `New message from ${req.doctor.name}`,
      body: body.length > 120 ? body.slice(0, 117) + '…' : body, link: '/dashboard/messages' });
    logActivity(req, { kind: 'activity', actor: req.doctor.name, action: `Messaged ${patient.name}`, target: uhid, category: 'Message' });
    res.status(201).json(msg);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not send your message.' }); }
});

module.exports = router;
