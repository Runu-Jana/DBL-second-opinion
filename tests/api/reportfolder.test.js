// Triaging a patient's folder categorises every one of their reports at once and routes them all to
// the SAME specialist — an upload of several files is never split across two doctors.
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
  const call = async (m, p, token, body) => {
    const r = await fetch(B + p, {
      method: m, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };

  const stamp = Date.now();
  const uhid = 'DBLRF' + String(stamp).slice(-5);
  const docName = `Dr Folder ${stamp}`;
  const adminTok = jwt.sign({ id: 1, email: 'a@b.com', name: 'Admin', role: 'admin' }, S, { expiresIn: '1d' });
  const dTok = jwt.sign({ id: 601, name: docName, role: 'doctor', jobRole: 'Oncologist' }, S, { expiresIn: '1d' });

  // one specialist tagged for the category — every file must go to this one
  await prisma.staff.create({ data: { name: docName, role: 'Oncologist', status: 'Active', password: 'x', specialties: 'Lung Cancer', email: `df${stamp}@x.com` } });
  const patient = await prisma.patient.create({ data: { name: `Folder Patient ${stamp}`, uhid, email: `rf${stamp}@x.com` } });
  await prisma.report.createMany({ data: [
    { patientName: patient.name, patientUhid: uhid, type: 'Patient Upload', date: '22 Sep 2026', status: 'Pending Review', fileUrl: '/uploads/a.pdf' },
    { patientName: patient.name, patientUhid: uhid, type: 'Patient Upload', date: '22 Sep 2026', status: 'Pending Review', fileUrl: '/uploads/b.jpg' },
    { patientName: patient.name, patientUhid: uhid, type: 'Patient Upload', date: '22 Sep 2026', status: 'Pending Review', fileUrl: '/uploads/c.png' },
  ] });

  // only an admin may triage a folder
  check('a doctor cannot triage a folder', (await call('POST', '/reports/categorise-folder', dTok, { patientUhid: uhid, category: 'Lung Cancer' })).status, 403);
  check('an unknown category is refused', (await call('POST', '/reports/categorise-folder', adminTok, { patientUhid: uhid, category: 'Nope' })).status, 400);

  // triage the whole folder
  const done = await call('POST', '/reports/categorise-folder', adminTok, { patientUhid: uhid, category: 'Lung Cancer' });
  check('the folder is categorised', done.status, 200);
  check('  all three files counted', done.body.count, 3);
  check('  a specialist was assigned', !!done.body.assignedTo, true);
  const routedTo = done.body.assignedTo;

  const reports = await prisma.report.findMany({ where: { patientUhid: uhid } });
  check('every report now has the category', reports.every((r) => r.category === 'Lung Cancer'), true);
  // The point of the endpoint: not split across doctors. All files share ONE doctor.
  check('and every report has the SAME doctor', [...new Set(reports.map((r) => r.doctor))], [routedTo]);

  const updatedPatient = await prisma.patient.findFirst({ where: { uhid } });
  check('the patient record is synced to that doctor', updatedPatient.doctor, routedTo);
  const kase = await prisma.secondOpinion.findFirst({ where: { patientUhid: uhid } });
  check('a case exists for the folder', !!kase, true);
  check('  with the same doctor as expert', kase.expert, routedTo);

  await prisma.notification.deleteMany({ where: { recipient: { in: [uhid, docName] } } });
  await prisma.report.deleteMany({ where: { patientUhid: uhid } });
  await prisma.secondOpinion.deleteMany({ where: { patientUhid: uhid } });
  await prisma.patient.deleteMany({ where: { uhid } });
  await prisma.staff.deleteMany({ where: { name: docName } });
  await prisma.$disconnect();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
