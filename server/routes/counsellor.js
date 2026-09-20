// Counsellor portal — the stage that comes BEFORE a doctor sees anything.
//
// The flow this serves: a patient uploads documents, those land here uncategorised, and a
// counsellor opens the patient's folder, reads everything, writes an assessment (with an AI
// first draft if they want one), then assigns the specialist. Only at that point does the case
// reach a doctor, and it arrives with the counsellor's report attached.
//
// A "folder" is not a new table. A patient's documents are their Report rows joined by uhid,
// and the case itself is the SecondOpinion row — which already carried the assigned expert and
// cancer type, and now carries the counsellor's report too.
const express = require('express');
const prisma = require('../db');
const { requireCounsellor } = require('./auth');
const { logActivity } = require('../lib/audit');
const { notifyPatient, notifyDoctor } = require('../lib/notify');
const { analyzeReport, configured: aiConfigured } = require('../lib/reportAI');
const { CATEGORIES, splitCategories } = require('../lib/categories');

const router = express.Router();
const str = (v) => (v == null ? '' : String(v).trim());
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const today = () => { const n = new Date(); return `${n.getDate()} ${MONTHS[n.getMonth()]} ${n.getFullYear()}`; };

const sameName = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();

// Documents belong to a patient by uhid where we have one, and by name for older rows created
// before uploads started linking properly.
const docsWhere = (patient) => (patient.uhid
  ? { OR: [{ patientUhid: patient.uhid }, { patientName: { equals: patient.name, mode: 'insensitive' } }] }
  : { patientName: { equals: patient.name, mode: 'insensitive' } });

const caseWhere = (patient) => (patient.uhid
  ? { patientUhid: patient.uhid }
  : { patientName: { equals: patient.name, mode: 'insensitive' } });

// A case row may not exist the first time a counsellor works a folder.
async function upsertCase(patient, data) {
  const existing = await prisma.secondOpinion.findFirst({ where: caseWhere(patient) });
  if (existing) return prisma.secondOpinion.update({ where: { id: existing.id }, data });
  return prisma.secondOpinion.create({
    data: {
      patientName: patient.name,
      patientUhid: patient.uhid || null,
      submittedDate: today(),
      status: 'Awaiting Review',
      priority: 'Normal',
      ...data,
    },
  });
}

// ---- GET /api/counsellor/summary — dashboard counters ----------------------------------
router.get('/summary', requireCounsellor, async (_req, res) => {
  try {
    const [patients, awaitingTriage, assigned, totalDocs] = await Promise.all([
      prisma.patient.count(),
      prisma.report.count({ where: { category: null } }),
      prisma.report.count({ where: { doctor: { not: null } } }),
      prisma.report.count(),
    ]);
    res.json({ patients, awaitingTriage, assigned, totalDocs, ai: aiConfigured() });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load the dashboard.' }); }
});

// ---- GET /api/counsellor/folders — one row per patient ---------------------------------
router.get('/folders', requireCounsellor, async (req, res) => {
  try {
    const q = str(req.query.q);
    const where = q
      ? { OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { uhid: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ] }
      : {};
    const patients = await prisma.patient.findMany({ where, orderBy: [{ updatedAt: 'desc' }], take: 200 });

    // One pass over reports and cases, rather than two queries per patient.
    const [reports, cases] = await Promise.all([prisma.report.findMany(), prisma.secondOpinion.findMany()]);
    const folders = patients.map((p) => {
      const mine = reports.filter((r) => (p.uhid && r.patientUhid === p.uhid) || sameName(r.patientName, p.name));
      const kase = cases.find((c) => (p.uhid && c.patientUhid === p.uhid) || sameName(c.patientName, p.name)) || null;
      return {
        id: p.id,
        name: p.name,
        uhid: p.uhid,
        email: p.email,
        phone: p.phone,
        status: p.status,
        cancerType: p.cancerType,
        joined: p.createdAt,
        documents: mine.length,
        untriaged: mine.filter((r) => !r.category).length,
        assignedDoctor: (kase && kase.expert) || (mine.find((r) => r.doctor) || {}).doctor || null,
        hasReport: !!(kase && kase.counsellorReport),
        caseStatus: kase ? kase.status : null,
      };
    });
    res.json(folders);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load patient folders.' }); }
});

// ---- GET /api/counsellor/folders/:id — one patient's whole folder ----------------------
router.get('/folders/:id', requireCounsellor, async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { id: +req.params.id } });
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });
    const [documents, kase, staff] = await Promise.all([
      prisma.report.findMany({ where: docsWhere(patient), orderBy: [{ createdAt: 'desc' }] }),
      prisma.secondOpinion.findFirst({ where: caseWhere(patient) }),
      prisma.staff.findMany({ where: { status: 'Active', password: { not: null } } }),
    ]);
    res.json({
      patient,
      documents,
      case: kase,
      categories: CATEGORIES,
      ai: aiConfigured(),
      // Who this case could go to, and what each of them covers.
      doctors: staff
        .filter((d) => splitCategories(d.specialties).length)
        .map((d) => ({
          id: d.id, name: d.name, role: d.role, department: d.department,
          categories: splitCategories(d.specialties),
        })),
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load the folder.' }); }
});

// ---- POST /api/counsellor/documents/:id/analyse — AI reading of one document -----------
router.post('/documents/:id/analyse', requireCounsellor, async (req, res) => {
  try {
    const report = await prisma.report.findUnique({ where: { id: +req.params.id } });
    if (!report) return res.status(404).json({ error: 'Document not found.' });
    const summary = await analyzeReport(report);
    const saved = await prisma.report.update({ where: { id: report.id }, data: { aiSummary: summary } });
    res.json({ ok: true, aiSummary: saved.aiSummary });
  } catch (e) {
    if (e.code === 'UNSUPPORTED' || e.code === 'NO_FILE') return res.status(400).json({ error: e.message });
    console.error(e);
    res.status(502).json({ error: 'The AI could not read this document right now.' });
  }
});

// ---- POST /api/counsellor/folders/:id/draft — AI first draft of the case report --------
router.post('/folders/:id/draft', requireCounsellor, async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { id: +req.params.id } });
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });
    const documents = await prisma.report.findMany({ where: docsWhere(patient) });
    const read = documents.filter((d) => d.aiSummary);
    if (!read.length) {
      return res.status(400).json({ error: 'Run the AI over at least one document first — the draft is built from those readings.' });
    }
    // Assembled from readings we already have rather than a second pass over the files: it keeps
    // the draft grounded in what was actually extracted, and costs nothing extra.
    const draft = [
      `Case summary for ${patient.name}${patient.uhid ? ` (${patient.uhid})` : ''}`,
      `Prepared ${today()} · ${read.length} of ${documents.length} document(s) read by AI`,
      '',
      ...read.map((d) => `— ${d.type || 'Document'} (${d.date || 'undated'})\n${d.aiSummary}`),
      '',
      'Counsellor assessment:',
      '(correct anything the AI got wrong and add your own assessment before assigning a specialist)',
    ].join('\n');
    const kase = await upsertCase(patient, { aiDraft: draft });
    res.json({ ok: true, draft, case: kase });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not build the draft.' }); }
});

// ---- PUT /api/counsellor/folders/:id/report — save the counsellor's assessment ---------
router.put('/folders/:id/report', requireCounsellor, async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { id: +req.params.id } });
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });
    const kase = await upsertCase(patient, {
      counsellorReport: str(req.body.report) || null,
      counsellor: req.counsellor.name,
      ...(str(req.body.cancerType) ? { cancerType: str(req.body.cancerType) } : {}),
      ...(['Normal', 'High', 'Urgent'].includes(str(req.body.priority)) ? { priority: str(req.body.priority) } : {}),
    });
    logActivity(req, {
      kind: 'activity', actor: req.counsellor.name,
      action: `Case report saved for ${patient.name}`, target: patient.uhid, category: 'Report',
    });
    res.json({ ok: true, case: kase });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not save the report.' }); }
});

// ---- POST /api/counsellor/folders/:id/assign — hand the case to a specialist -----------
router.post('/folders/:id/assign', requireCounsellor, async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { id: +req.params.id } });
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });
    const doctor = str(req.body.doctor);
    const category = str(req.body.category);
    if (!doctor) return res.status(400).json({ error: 'Choose a specialist to assign.' });
    if (category && !CATEGORIES.includes(category)) return res.status(400).json({ error: 'That category is not valid.' });

    const staff = await prisma.staff.findFirst({ where: { name: doctor, status: 'Active' } });
    if (!staff) return res.status(400).json({ error: 'That specialist is not an active staff member.' });

    // The report is the point of this stage, so it has to exist before the case moves on.
    const kase = await prisma.secondOpinion.findFirst({ where: caseWhere(patient) });
    if (!kase || !kase.counsellorReport) {
      return res.status(400).json({ error: 'Write and save your case report before assigning a doctor — it is what the specialist receives.' });
    }

    // Stamp the assignment on the documents as well as the case, so the doctor's existing
    // "assigned to me" view picks the whole folder up unchanged.
    await prisma.report.updateMany({
      where: docsWhere(patient),
      data: { doctor, ...(category ? { category } : {}), status: 'Pending Review' },
    });
    const updated = await prisma.secondOpinion.update({
      where: { id: kase.id },
      data: {
        expert: doctor,
        assignedAt: new Date(),
        status: 'Under Review',
        ...(category ? { cancerType: category } : {}),
      },
    });
    await prisma.patient.update({
      where: { id: patient.id },
      data: { doctor, ...(category && !patient.cancerType ? { cancerType: category } : {}) },
    }).catch(() => {});

    logActivity(req, {
      kind: 'audit', actor: req.counsellor.name,
      action: `Assigned ${patient.name} to ${doctor}`, target: patient.uhid, category: 'Report',
    });
    // Both ends of the handover hear about it: the patient gets a name, the specialist gets work.
    await notifyPatient(patient.uhid, { kind: 'case', title: 'A specialist has been assigned to your case',
      body: `${doctor} will review your reports${category ? ` for ${category}` : ''}.`, link: '/dashboard/cases' });
    await notifyDoctor(doctor, { kind: 'case', title: 'New case assigned to you',
      body: `${patient.name}${patient.uhid ? ` (${patient.uhid})` : ''} — reviewed and handed over by ${req.counsellor.name}.`, link: null });
    res.json({ ok: true, case: updated });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not assign the specialist.' }); }
});

module.exports = router;
