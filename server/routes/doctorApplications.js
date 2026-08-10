// Doctor applications — public submit (from the Join Network form) + admin review/approve.
const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { requireAdmin } = require('./auth');
const { logActivity } = require('../lib/audit');

const router = express.Router();
const STATUSES = ['Pending', 'Approved', 'Rejected'];

// specialization -> Staff role for the created doctor account
const ROLE_BY_SPEC = {
  'Medical Oncology': 'Oncologist',
  'Surgical Oncology': 'Surgeon',
  'Radiation Oncology': 'Radiologist',
  'Hematology-Oncology': 'Oncologist',
  'Clinical Pharmacology': 'Clinical Pharmacist',
  'Pathology': 'Lab Technician',
  'Nuclear Medicine': 'Radiologist',
};
const firstInt = (s) => { const m = String(s || '').match(/\d+/); return m ? parseInt(m[0], 10) : 5; };

function parse(b = {}) {
  return {
    name: String(b.name || '').trim(),
    email: String(b.email || '').trim().toLowerCase(),
    phone: b.phone ? String(b.phone).trim() : null,
    registrationNo: b.registrationNo ? String(b.registrationNo).trim() : (b.regNo ? String(b.regNo).trim() : null),
    specialization: b.specialization ? String(b.specialization).trim() : (b.spec ? String(b.spec).trim() : null),
    experience: b.experience ? String(b.experience).trim() : (b.exp ? String(b.exp).trim() : null),
    qualification: b.qualification ? String(b.qualification).trim() : (b.qual ? String(b.qual).trim() : null),
    country: b.country ? String(b.country).trim() : null,
    about: b.about ? String(b.about).trim() : (b.brief ? String(b.brief).trim() : null),
  };
}

// POST /api/doctor-applications  (PUBLIC — the Join Network form) -> creates a Pending application
router.post('/', async (req, res) => {
  try {
    const data = parse(req.body);
    if (!data.name || !data.email) return res.status(400).json({ error: 'Name and email are required.' });
    const created = await prisma.doctorApplication.create({ data: { ...data, status: 'Pending' } });
    logActivity(req, { kind: 'activity', actor: created.name, action: `New doctor application from ${created.name}`, target: created.specialization || null, category: 'Application' });
    res.status(201).json({ ok: true, id: created.id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not submit your application.' }); }
});

// GET /api/doctor-applications  (admin) — ?status, ?q
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { q, status } = req.query;
    const where = {};
    // Explicit status filter honours history (e.g. viewing Approved). With no filter,
    // hide Approved applications — an approved doctor "moves" to Staff Management + the
    // public site, so they should leave this review queue.
    if (status && STATUSES.includes(status)) where.status = status;
    else where.status = { not: 'Approved' };
    if (q) where.OR = [
      { name: { contains: String(q), mode: 'insensitive' } },
      { email: { contains: String(q), mode: 'insensitive' } },
      { specialization: { contains: String(q), mode: 'insensitive' } },
    ];
    res.json(await prisma.doctorApplication.findMany({ where, orderBy: [{ createdAt: 'desc' }] }));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load applications.' }); }
});

// PUT /api/doctor-applications/:id  (admin) — update status / notes (e.g. Reject)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const data = {};
    if (STATUSES.includes(req.body.status)) data.status = req.body.status;
    if (req.body.notes !== undefined) data.notes = req.body.notes ? String(req.body.notes).trim() : null;
    const updated = await prisma.doctorApplication.update({ where: { id: +req.params.id }, data });
    if (data.status) logActivity(req, { kind: 'audit', action: `Application marked ${data.status}`, target: updated.name, category: 'Application' });
    res.json(updated);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e); res.status(500).json({ error: 'Could not update the application.' });
  }
});

// POST /api/doctor-applications/:id/approve  (admin) -> approve + create a Staff login and a public Oncologist listing
router.post('/:id/approve', requireAdmin, async (req, res) => {
  try {
    const app = await prisma.doctorApplication.findUnique({ where: { id: +req.params.id } });
    if (!app) return res.status(404).json({ error: 'Not found.' });

    const role = ROLE_BY_SPEC[app.specialization] || 'Oncologist';
    const now = new Date();
    const joined = `${now.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][now.getMonth()]} ${now.getFullYear()}`;

    // 1) Staff record with a login (default password) — unless one already exists for this email
    const existingStaff = app.email ? await prisma.staff.findFirst({ where: { email: { equals: app.email, mode: 'insensitive' } } }) : null;
    let staffCreated = false;
    if (!existingStaff) {
      const password = await bcrypt.hash('doctor123', 10);
      await prisma.staff.create({
        data: { name: app.name, role, department: app.specialization || null, qualifications: app.qualification || null, email: app.email, password, status: 'Active', joinedDate: joined },
      });
      staffCreated = true;
    }

    // 2) Public Oncologist listing
    const existingOnc = await prisma.oncologist.findFirst({ where: { name: { equals: app.name, mode: 'insensitive' } } });
    if (!existingOnc) {
      await prisma.oncologist.create({
        data: { name: app.name, specialty: app.specialization || 'Medical Oncology', qualifications: app.qualification || 'MBBS', experience: firstInt(app.experience), city: app.country || null, active: true },
      });
    }

    const updated = await prisma.doctorApplication.update({ where: { id: app.id }, data: { status: 'Approved' } });
    logActivity(req, { kind: 'audit', action: 'Approved doctor application', target: app.name, category: 'Application' });
    logActivity(req, { kind: 'activity', action: `${app.name} approved and onboarded${staffCreated ? ' (login created)' : ''}`, category: 'Application' });
    res.json({ ok: true, application: updated, staffCreated, login: staffCreated ? { email: app.email, password: 'doctor123' } : null });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not approve the application.' }); }
});

// DELETE /api/doctor-applications/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await prisma.doctorApplication.delete({ where: { id: +req.params.id } });
    logActivity(req, { kind: 'audit', action: 'Deleted doctor application', target: deleted.name, category: 'Application' });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e); res.status(500).json({ error: 'Could not delete the application.' });
  }
});

module.exports = router;
