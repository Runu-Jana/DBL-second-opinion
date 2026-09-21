// Doctor & Staff CRUD — admin only (internal staff directory)
const express = require('express');
const prisma = require('../db');
const { requireAdmin, inviteStaff, linkOrigin, portalFor, signStaffPreview } = require('./auth');
const { logCrud, logActivity } = require('../lib/audit');

const router = express.Router();

const STATUSES = ['Active', 'On Leave', 'Inactive'];

// Never send the password hash to the client. Instead expose what the admin actually needs:
// whether this role can log in at all, whether they have set a password (activated), and when
// they last signed in — the three facts behind the "login pending / signed in" tag.
function publicStaff(s) {
  const { password, ...rest } = s;
  return { ...rest, hasPassword: !!password, canLogin: !!portalFor(s.role) };
}

function parseBody(b = {}) {
  return {
    name: String(b.name || '').trim(),
    role: String(b.role || '').trim(),
    department: b.department ? String(b.department).trim() : null,
    specialties: b.specialties ? String(b.specialties).trim() : null,
    qualifications: b.qualifications ? String(b.qualifications).trim() : null,
    email: b.email ? String(b.email).trim() : null,
    // Phone is digits and formatting only — strip letters so a direct API call cannot store junk
    // the form now blocks. Empty after stripping is treated as no phone.
    phone: b.phone ? (String(b.phone).replace(/[^\d+()\-\s]/g, '').trim() || null) : null,
    status: STATUSES.includes(b.status) ? b.status : 'Active',
    onCall: !!b.onCall,
    photoUrl: b.photoUrl ? String(b.photoUrl).trim() : null,
    joinedDate: b.joinedDate ? String(b.joinedDate).trim() : null,
    bio: b.bio ? String(b.bio).trim() : null,
  };
}

// GET /api/staff (admin) — ?q= search, ?status= filter
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { q, status } = req.query;
    const where = {};
    if (status && STATUSES.includes(status)) where.status = status;
    if (q) {
      where.OR = [
        { name: { contains: String(q), mode: 'insensitive' } },
        { role: { contains: String(q), mode: 'insensitive' } },
        { department: { contains: String(q), mode: 'insensitive' } },
      ];
    }
    const list = await prisma.staff.findMany({ where, orderBy: [{ name: 'asc' }] });
    res.json(list.map(publicStaff));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load staff.' }); }
});

// GET /api/staff/:id (admin)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const s = await prisma.staff.findUnique({ where: { id: +req.params.id } });
    if (!s) return res.status(404).json({ error: 'Not found.' });
    res.json(publicStaff(s));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load staff member.' }); }
});

// POST /api/staff (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const data = parseBody(req.body);
    if (!data.name || !data.role) return res.status(400).json({ error: 'Name and role are required.' });
    const created = await prisma.staff.create({ data });
    logCrud(req, 'Created', 'Staff', created.name, { activity: true });
    // No password is ever set here. Portal access is opt-in per person (`portalAccess` from
    // the admin form) so non-clinical staff aren't emailed a doctor-portal login they'll never
    // use. When opted in, they get a one-time link to choose their own password. Best-effort —
    // the admin can always resend via POST /:id/invite.
    let invited = false;
    if (created.email && req.body.portalAccess) {
      try { const r = await inviteStaff(created, linkOrigin(req)); invited = !r.skipped; }
      catch (e) { console.error('staff invite email failed:', e.message); }
    }
    res.status(201).json({ ...created, invited });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not create staff member.' }); }
});

// POST /api/staff/:id/invite (admin) — (re)send the "set your password" link for portal access
router.post('/:id/invite', requireAdmin, async (req, res) => {
  try {
    const staff = await prisma.staff.findUnique({ where: { id: +req.params.id } });
    if (!staff) return res.status(404).json({ error: 'Not found.' });
    if (!staff.email) return res.status(400).json({ error: 'Add an email address for this staff member first.' });
    const r = await inviteStaff(staff, linkOrigin(req));
    if (r.skipped) return res.status(503).json({ error: 'Email is not configured on the server, so the link could not be sent.' });
    logActivity(req, { kind: 'audit', action: 'Sent portal set-password link', target: `Staff · ${staff.name}`, category: 'Login' });
    res.json({ ok: true, sentTo: staff.email });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not send the set-password email.' }); }
});

// POST /api/staff/:id/impersonate (admin) — a read-only token to open this staff member's own
// dashboard as an admin preview. No password, no side effects: the portal blocks every write and
// hides the "review started" signal. Every open is written to the audit log against the admin.
router.post('/:id/impersonate', requireAdmin, async (req, res) => {
  try {
    const staff = await prisma.staff.findUnique({ where: { id: +req.params.id } });
    if (!staff) return res.status(404).json({ error: 'Not found.' });
    const made = signStaffPreview(staff, req.admin);
    if (!made) return res.status(400).json({ error: `${staff.role || 'This role'} has no dashboard to open.` });
    logActivity(req, { kind: 'audit', actor: (req.admin && req.admin.name) || 'Admin',
      action: `Opened ${staff.name}'s ${made.portal} dashboard (admin preview)`, target: `Staff · ${staff.name}`, category: 'Login' });
    res.json(made);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not open the dashboard.' }); }
});

// PUT /api/staff/:id (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const data = parseBody(req.body);
    if (!data.name || !data.role) return res.status(400).json({ error: 'Name and role are required.' });
    const updated = await prisma.staff.update({ where: { id: +req.params.id }, data });
    logCrud(req, 'Updated', 'Staff', updated.name);
    res.json(publicStaff(updated));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e); res.status(500).json({ error: 'Could not update staff member.' });
  }
});

// DELETE /api/staff/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await prisma.staff.delete({ where: { id: +req.params.id } });
    logCrud(req, 'Deleted', 'Staff', deleted.name);
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found.' });
    console.error(e); res.status(500).json({ error: 'Could not delete staff member.' });
  }
});

module.exports = router;
module.exports.STATUSES = STATUSES;
