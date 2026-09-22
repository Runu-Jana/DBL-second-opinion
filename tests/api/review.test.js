// Opening a case is the specialist reviewing its documents: the reports move from pending to
// reviewed, the pending count drops, and the patient is told once — while an admin preview leaves
// everything untouched.
(async () => {
  const ROOT = process.cwd();
  const jwt = require(ROOT + '/node_modules/jsonwebtoken');
  const { PrismaClient } = require(ROOT + '/node_modules/@prisma/client');
  const prisma = new PrismaClient();
  const B = 'http://localhost:5500/api';
  const S = 't';

  let pass = 0, fail = 0;
  const check = (n, got, want) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    ok ? pass++ : fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `  (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`}`);
  };
  const call = async (m, p, token) => {
    const r = await fetch(B + p, { method: m, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}) } });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };

  const stamp = Date.now();
  const docName = `Dr Review ${stamp}`;
  const uhid = 'DBLRV' + String(stamp).slice(-5);
  const dTok = jwt.sign({ id: 701, name: docName, role: 'doctor', jobRole: 'Oncologist' }, S, { expiresIn: '1d' });
  const impTok = jwt.sign({ id: 702, name: docName, role: 'doctor', jobRole: 'Oncologist', imp: true, by: 'Admin' }, S, { expiresIn: '1d' });

  await prisma.staff.create({ data: { name: docName, role: 'Oncologist', status: 'Active', password: 'x', specialties: 'Lung Cancer', email: `dr${stamp}@x.com` } });
  const patient = await prisma.patient.create({ data: { name: `Review Patient ${stamp}`, uhid, email: `rv${stamp}@x.com`, doctor: docName } });
  await prisma.report.createMany({ data: [
    { patientName: patient.name, patientUhid: uhid, type: 'Patient Upload', date: '21 Sep 2026', status: 'Pending Review', doctor: docName, fileUrl: '/uploads/a.pdf' },
    { patientName: patient.name, patientUhid: uhid, type: 'Patient Upload', date: '21 Sep 2026', status: 'Pending Review', doctor: docName, fileUrl: '/uploads/b.pdf' },
  ] });
  await prisma.secondOpinion.create({ data: { patientName: patient.name, patientUhid: uhid, expert: docName, status: 'Under Review', priority: 'High', counsellorReport: 'Handover.', cancerType: 'Lung Cancer', assignedAt: new Date() } });

  const pendingCount = async () => (await call('GET', '/doctor/me', dTok)).body.stats.pendingReports;

  check('both reports start pending', await pendingCount(), 2);

  // An admin preview opening the case must not mark anything reviewed.
  check('preview can open the case', (await call('GET', `/doctor/cases/${uhid}`, impTok)).status, 200);
  check('  and leaves the pending count untouched', await pendingCount(), 2);
  check('  and writes no patient notification', await prisma.notification.count({ where: { recipient: uhid } }), 0);

  // The specialist opening the case reviews the documents.
  const open = await call('GET', `/doctor/cases/${uhid}`, dTok);
  check('the specialist opens the case', open.status, 200);
  check('  and the returned documents read as reviewed', open.body.documents.every((d) => d.status === 'Reviewed'), true);
  check('pending review is now zero', await pendingCount(), 0);
  check('  and the reports are marked reviewed in the database', await prisma.report.count({ where: { patientUhid: uhid, status: 'Reviewed' } }), 2);

  const notif = await prisma.notification.findFirst({ where: { recipient: uhid, title: { contains: 'have been reviewed' } } });
  check('the patient is told their reports were reviewed', !!notif, true);
  check('  naming both reports', notif.body.includes('reports'), true);

  // The case is still the doctor's to opine on — it stays in the review queue, not delivered.
  const cases = await call('GET', '/doctor/cases', dTok);
  const mine = cases.body.find((c) => c.uhid === uhid);
  check('the case is still in the queue', !!mine, true);
  check('  with no reports left flagged new', mine.pending, 0);
  check('  and not delivered', mine.delivered, false);

  // Opening again changes nothing and does not notify twice.
  await call('GET', `/doctor/cases/${uhid}`, dTok);
  check('a second open sends no second notification', await prisma.notification.count({ where: { recipient: uhid, title: { contains: 'have been reviewed' } } }), 1);

  await prisma.notification.deleteMany({ where: { recipient: uhid } });
  await prisma.report.deleteMany({ where: { patientUhid: uhid } });
  await prisma.secondOpinion.deleteMany({ where: { patientUhid: uhid } });
  await prisma.patient.deleteMany({ where: { uhid } });
  await prisma.staff.deleteMany({ where: { name: docName } });
  await prisma.$disconnect();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
