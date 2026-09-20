// Notifications — telling people when the thing they are waiting on actually moves.
//
// A patient who uploads reports and hears nothing assumes nothing is happening. These fire at
// the points where something real changed for the person being told, and deliberately not at
// every internal step: a counsellor saving a draft assessment, or a doctor saving an unsent
// opinion, must not reach the patient, because from their side nothing has happened yet.
//
// Delivery is always best-effort. A notification failing must never take down the action that
// triggered it — nobody should lose a delivered second opinion because a row would not insert.
const prisma = require('../db');

async function notify({ audience, recipient, title, body = null, kind = 'case', link = null }) {
  if (!audience || !recipient || !title) return null;
  try {
    return await prisma.notification.create({
      data: { audience, recipient: String(recipient), title, body, kind, link },
    });
  } catch (e) {
    console.error('notification failed:', e.message);
    return null;
  }
}

// Patients are addressed by UHID, staff by name — the same keys the rest of the app joins on.
const notifyPatient = (uhid, n) => (uhid ? notify({ ...n, audience: 'patient', recipient: uhid }) : null);
const notifyDoctor = (name, n) => (name ? notify({ ...n, audience: 'doctor', recipient: name }) : null);
const notifyCounsellor = (name, n) => (name ? notify({ ...n, audience: 'counsellor', recipient: name }) : null);

// Every counsellor needs to see intake events, not just one — a new upload belongs to whoever
// picks it up. Staff with a portal login and a counselling role all get a copy.
async function notifyCounsellors(n) {
  try {
    const staff = await prisma.staff.findMany({
      where: { status: 'Active', password: { not: null }, role: { in: ['Counsellor', 'Care Coordinator'] } },
    });
    await Promise.all(staff.map((s) => notifyCounsellor(s.name, n)));
    return staff.length;
  } catch (e) {
    console.error('counsellor fan-out failed:', e.message);
    return 0;
  }
}

module.exports = { notify, notifyPatient, notifyDoctor, notifyCounsellor, notifyCounsellors };
