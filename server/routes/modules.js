// All standard admin CRUD modules built from the generic factory, plus activity log + settings.
const express = require('express');
const prisma = require('../db');
const { requireAdmin } = require('./auth');
const { crudRouter, str, int, inSet } = require('./_crud');
const { CATEGORIES, splitCategories } = require('../lib/categories');
const { logActivity } = require('../lib/audit');
const reportAI = require('../lib/reportAI');

const need = (v) => (v && String(v).trim() ? String(v).trim() : '');

/* ---------- status vocabularies ---------- */
const S = {
  report: ['Pending Review', 'Reviewed', 'Uploaded', 'Archived'],
  plan: ['Active', 'Completed', 'On Hold', 'Cancelled'],
  opinion: ['Awaiting Review', 'Under Review', 'Opinion Ready', 'Delivered'],
  medication: ['In Stock', 'Low Stock', 'Out of Stock'],
  invoice: ['Paid', 'Pending', 'Overdue', 'Refunded'],
  lab: ['Ordered', 'Sample Collected', 'In Progress', 'Completed'],
  user: ['Active', 'Inactive', 'Suspended'],
  announcement: ['Draft', 'Published', 'Archived'],
};

const reports = crudRouter({
  model: 'report', label: 'Report', statuses: S.report, searchFields: ['patientName', 'type', 'doctor', 'category'],
  parse: (b) => {
    const patientName = need(b.patientName); if (!patientName) return { error: 'Patient is required.' };
    return { data: { patientName, patientUhid: str(b.patientUhid), type: str(b.type) || 'CT Scan', category: inSet(str(b.category), CATEGORIES, null), doctor: str(b.doctor), date: str(b.date), fileUrl: str(b.fileUrl), status: inSet(b.status, S.report, 'Pending Review'), notes: str(b.notes) } };
  },
});

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Push a report's triage result onto the linked Patient record AND the patient's second-opinion
// case, so the Patient Management and "Review & Second Opinion" tabs stay in sync with the report.
async function syncTriageToPatient(report, category, assigned) {
  const nameMatch = { name: { equals: report.patientName, mode: 'insensitive' } };
  const patient = await prisma.patient.findFirst({
    where: report.patientUhid ? { OR: [{ uhid: report.patientUhid }, nameMatch] } : nameMatch,
  });
  if (patient) {
    await prisma.patient.update({
      where: { id: patient.id },
      data: {
        cancerType: category,
        ...(assigned ? { doctor: assigned } : {}),
        ...(patient.status === 'New Patient' ? { status: 'Under Treatment' } : {}),
      },
    });
  }

  // One second-opinion case per patient — upsert by uhid (or name).
  const soMatch = report.patientUhid
    ? { patientUhid: report.patientUhid }
    : { patientName: { equals: report.patientName, mode: 'insensitive' } };
  const so = await prisma.secondOpinion.findFirst({ where: soMatch });
  const now = new Date();
  const submitted = report.date || `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  const liveStatus = assigned ? 'Under Review' : 'Awaiting Review';
  if (so) {
    // don't downgrade a case that's already been reviewed/delivered
    const keep = so.status === 'Opinion Ready' || so.status === 'Delivered';
    await prisma.secondOpinion.update({
      where: { id: so.id },
      data: { expert: assigned, cancerType: category, status: keep ? so.status : liveStatus },
    });
  } else {
    await prisma.secondOpinion.create({
      data: {
        patientName: report.patientName, patientUhid: report.patientUhid || null,
        expert: assigned, cancerType: category, priority: 'Normal', submittedDate: submitted, status: liveStatus,
      },
    });
  }
}

// POST /api/reports/:id/categorise — counselor sets the category; the report is auto-routed to the
// least-loaded active specialist tagged with that category (round-robin by current workload).
reports.post('/:id/categorise', requireAdmin, async (req, res) => {
  try {
    const category = inSet(str(req.body.category), CATEGORIES, null);
    if (!category) return res.status(400).json({ error: 'A valid category is required.' });
    const report = await prisma.report.findUnique({ where: { id: +req.params.id } });
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    // Eligible specialists: active staff WITH a portal login whose specialties include this category.
    const docs = await prisma.staff.findMany({ where: { status: 'Active', password: { not: null } } });
    const eligible = docs.filter((d) => splitCategories(d.specialties).includes(category));

    let assigned = null;
    if (eligible.length) {
      // Least-loaded wins (round-robin over time): fewest non-archived reports currently assigned.
      const counts = await Promise.all(
        eligible.map((d) => prisma.report.count({ where: { doctor: d.name, status: { not: 'Archived' } } }))
      );
      let best = 0;
      for (let i = 1; i < eligible.length; i++) if (counts[i] < counts[best]) best = i;
      assigned = eligible[best].name;
    }

    const updated = await prisma.report.update({
      where: { id: report.id },
      data: { category, doctor: assigned },
    });

    // Keep the patient record + second-opinion case in sync with this triage.
    await syncTriageToPatient(report, category, assigned);

    logActivity(req, { kind: 'audit', action: `Triaged as ${category}${assigned ? ` → ${assigned}` : ''}`, target: `Report · ${report.patientName}`, category: 'Report' });
    logActivity(req, { kind: 'activity', action: `Report for ${report.patientName} categorised as ${category}${assigned ? ` and routed to ${assigned}` : ''}`, category: 'Report' });
    res.json({ ...updated, assignedTo: assigned, eligibleCount: eligible.length });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not categorise the report.' }); }
});

// POST /api/reports/:id/analyze — Claude reads the uploaded file and returns a structured summary
// + a suggested category (decision-support). The summary is saved on the report for the doctor.
reports.post('/:id/analyze', requireAdmin, async (req, res) => {
  try {
    const report = await prisma.report.findUnique({ where: { id: +req.params.id } });
    if (!report) return res.status(404).json({ error: 'Report not found.' });
    if (!report.fileUrl) return res.status(400).json({ error: 'This report has no file to analyse.' });

    const result = await reportAI.analyzeReport(report);
    const summaryText = [
      result.summary || '',
      result.keyFindings?.length ? '• ' + result.keyFindings.join('\n• ') : '',
      result.caveats ? `Caveat: ${result.caveats}` : '',
    ].filter(Boolean).join('\n');
    await prisma.report.update({ where: { id: report.id }, data: { aiSummary: summaryText } });
    logActivity(req, { kind: 'activity', action: `AI read ${report.patientName}'s report → suggests ${result.suggestedCategory}`, category: 'Report' });
    res.json(result);
  } catch (e) {
    if (e.code === 'NOT_CONFIGURED') return res.status(503).json({ error: e.message });
    if (e.code === 'NO_FILE' || e.code === 'UNSUPPORTED') return res.status(400).json({ error: e.message });
    console.error('report AI error:', e);
    res.status(500).json({ error: 'AI analysis failed. Please try again.' });
  }
});

const treatmentPlans = crudRouter({
  model: 'treatmentPlan', label: 'Treatment Plan', statuses: S.plan, searchFields: ['patientName', 'diagnosis', 'doctor', 'regimen'],
  parse: (b) => {
    const patientName = need(b.patientName); if (!patientName) return { error: 'Patient is required.' };
    return { data: { patientName, patientUhid: str(b.patientUhid), doctor: str(b.doctor), diagnosis: str(b.diagnosis), regimen: str(b.regimen), modality: str(b.modality) || 'Chemotherapy', cyclesTotal: int(b.cyclesTotal), cyclesDone: int(b.cyclesDone), startDate: str(b.startDate), status: inSet(b.status, S.plan, 'Active'), notes: str(b.notes) } };
  },
});

const secondOpinions = crudRouter({
  model: 'secondOpinion', label: 'Second Opinion', statuses: S.opinion, searchFields: ['patientName', 'expert', 'cancerType'],
  parse: (b) => {
    const patientName = need(b.patientName); if (!patientName) return { error: 'Patient is required.' };
    return { data: { patientName, patientUhid: str(b.patientUhid), expert: str(b.expert), cancerType: str(b.cancerType), priority: inSet(b.priority, ['Normal', 'High', 'Urgent'], 'Normal'), submittedDate: str(b.submittedDate), status: inSet(b.status, S.opinion, 'Awaiting Review'), summary: str(b.summary) } };
  },
});

const medications = crudRouter({
  model: 'medication', label: 'Medication', statuses: S.medication, searchFields: ['name', 'category', 'form'],
  parse: (b) => {
    const name = need(b.name); if (!name) return { error: 'Medication name is required.' };
    return { data: { name, category: str(b.category) || 'Chemotherapy', form: str(b.form), strength: str(b.strength), stock: int(b.stock), price: int(b.price), status: inSet(b.status, S.medication, 'In Stock') } };
  },
});

const invoices = crudRouter({
  model: 'invoice', label: 'Invoice', statuses: S.invoice, searchFields: ['patientName', 'service'],
  parse: (b) => {
    const patientName = need(b.patientName); if (!patientName) return { error: 'Patient is required.' };
    return { data: { patientName, patientUhid: str(b.patientUhid), service: str(b.service), amount: int(b.amount), date: str(b.date), method: inSet(b.method, ['Card', 'UPI', 'Cash', 'Bank Transfer', 'Insurance'], 'Card'), status: inSet(b.status, S.invoice, 'Pending'), notes: str(b.notes) } };
  },
});

const labTests = crudRouter({
  model: 'labTest', label: 'Lab Order', statuses: S.lab, searchFields: ['patientName', 'test', 'orderedBy'],
  parse: (b) => {
    const patientName = need(b.patientName); if (!patientName) return { error: 'Patient is required.' };
    return { data: { patientName, patientUhid: str(b.patientUhid), test: str(b.test) || 'CBC', orderedBy: str(b.orderedBy), date: str(b.date), status: inSet(b.status, S.lab, 'Ordered'), result: str(b.result) } };
  },
});

const users = crudRouter({
  model: 'appUser', label: 'User', statuses: S.user, searchFields: ['name', 'email', 'role'],
  orderBy: [{ name: 'asc' }],
  parse: (b) => {
    const name = need(b.name); const email = need(b.email);
    if (!name || !email) return { error: 'Name and email are required.' };
    return { data: { name, email: email.toLowerCase(), role: inSet(b.role, ['Super Admin', 'Admin', 'Doctor', 'Staff', 'Viewer'], 'Staff'), status: inSet(b.status, S.user, 'Active'), lastLogin: str(b.lastLogin) } };
  },
});

const announcements = crudRouter({
  model: 'announcement', label: 'Announcement', statuses: S.announcement, searchFields: ['title', 'body', 'audience'],
  parse: (b) => {
    const title = need(b.title); if (!title) return { error: 'Title is required.' };
    return { data: { title, body: str(b.body), audience: inSet(b.audience, ['All Staff', 'Doctors', 'Coordinators', 'Patients'], 'All Staff'), date: str(b.date), status: inSet(b.status, S.announcement, 'Published') } };
  },
});

/* ---------- Activity / Audit log (read-only) ---------- */
const activity = express.Router();
activity.get('/', requireAdmin, async (req, res) => {
  try {
    const kind = req.query.kind === 'audit' ? 'audit' : 'activity';
    const where = { kind };
    if (req.query.q) where.OR = [
      { action: { contains: String(req.query.q), mode: 'insensitive' } },
      { actor: { contains: String(req.query.q), mode: 'insensitive' } },
      { target: { contains: String(req.query.q), mode: 'insensitive' } },
    ];
    res.json(await prisma.activityLog.findMany({ where, orderBy: [{ id: 'desc' }] }));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load activity.' }); }
});

/* ---------- Settings (singleton) ---------- */
const settings = express.Router();
settings.get('/', requireAdmin, async (_req, res) => {
  try {
    const s = await prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
    res.json(s);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load settings.' }); }
});
settings.put('/', requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const data = {
      clinicName: str(b.clinicName) || 'DBL International',
      supportEmail: str(b.supportEmail) || 'support@dblinternational.com',
      supportPhone: str(b.supportPhone) || '',
      timezone: str(b.timezone) || 'Asia/Kolkata',
      emailNotifications: !!b.emailNotifications,
      smsNotifications: !!b.smsNotifications,
      maintenanceMode: !!b.maintenanceMode,
    };
    const s = await prisma.setting.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
    logActivity(req, { kind: 'audit', action: 'Updated platform settings', target: 'Settings', category: 'Settings' });
    res.json(s);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not save settings.' }); }
});

module.exports = { reports, treatmentPlans, secondOpinions, medications, invoices, labTests, users, announcements, activity, settings };
