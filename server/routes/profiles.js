// Admin oversight — everything about one person on one screen.
//
// The admin could already reach every table, but only as tables: to understand a patient you
// had to cross-reference Patients, Reports, Second Opinions and Communication by hand. These
// two endpoints assemble the whole picture for a patient or a staff member, so clicking a name
// answers "what is going on with this person" in one request.
//
// Admin-only, deliberately. It includes the counsellor's internal assessment and the
// doctor-patient conversation, which no other role should see in full.
const express = require('express');
const prisma = require('../db');
const { requireAdmin } = require('./auth');
const { splitCategories } = require('../lib/categories');

const router = express.Router();
const sameName = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();

// GET /api/profiles/patient/:id
router.get('/patient/:id', requireAdmin, async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { id: +req.params.id } });
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });

    const byPatient = patient.uhid
      ? { OR: [{ patientUhid: patient.uhid }, { patientName: { equals: patient.name, mode: 'insensitive' } }] }
      : { patientName: { equals: patient.name, mode: 'insensitive' } };

    const [documents, kase, messages, appointments, invoices] = await Promise.all([
      prisma.report.findMany({ where: byPatient, orderBy: [{ createdAt: 'desc' }] }),
      prisma.secondOpinion.findFirst({ where: byPatient }),
      prisma.message.findMany({ where: byPatient, orderBy: [{ createdAt: 'asc' }] }),
      prisma.appointment.findMany({ where: byPatient, orderBy: [{ createdAt: 'desc' }], take: 10 }),
      prisma.invoice.findMany({ where: byPatient, orderBy: [{ createdAt: 'desc' }], take: 10 }),
    ]);

    // Never hand back the password hash, even to an admin — nothing can be done with it here.
    const { password, ...safe } = patient;
    res.json({
      patient: safe,
      hasPassword: !!password,
      documents,
      case: kase,
      messages,
      appointments,
      invoices,
      counts: {
        documents: documents.length,
        messages: messages.length,
        unreadFromPatient: messages.filter((m) => m.sender === 'patient' && !m.readByCare).length,
      },
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load the patient profile.' }); }
});

// GET /api/profiles/staff/:id
router.get('/staff/:id', requireAdmin, async (req, res) => {
  try {
    const member = await prisma.staff.findUnique({ where: { id: +req.params.id } });
    if (!member) return res.status(404).json({ error: 'Staff member not found.' });

    const [patients, reports, cases, allPatients] = await Promise.all([
      prisma.patient.findMany({ where: { doctor: member.name }, orderBy: [{ updatedAt: 'desc' }] }),
      prisma.report.findMany({ where: { doctor: member.name } }),
      prisma.secondOpinion.findMany({ where: { OR: [{ expert: member.name }, { counsellor: member.name }] } }),
      prisma.patient.findMany({ select: { name: true, uhid: true, doctor: true } }),
    ]);

    const { password, ...safe } = member;
    res.json({
      staff: safe,
      hasPassword: !!password,
      categories: splitCategories(member.specialties),
      patients,
      cases,
      counts: {
        patients: patients.length,
        documents: reports.length,
        pending: reports.filter((r) => r.status === 'Pending Review').length,
        reviewed: reports.filter((r) => r.status === 'Reviewed').length,
        // Cases they triaged as a counsellor, as opposed to ones assigned to them as a doctor.
        triaged: cases.filter((c) => sameName(c.counsellor, member.name)).length,
        assigned: cases.filter((c) => sameName(c.expert, member.name)).length,
        delivered: cases.filter((c) => sameName(c.expert, member.name) && c.status === 'Delivered').length,
        onPanel: allPatients.filter((p) => sameName(p.doctor, member.name)).length,
      },
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load the staff profile.' }); }
});

module.exports = router;
