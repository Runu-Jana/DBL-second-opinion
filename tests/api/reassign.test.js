// A case can change specialist, and when it does the change is recorded: who it moved to, when,
// the stage it was at, and who moved it. The previous specialist is told it is no longer theirs.
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
  const cns = `Cns Reassign ${stamp}`;
  const docA = `Dr A ${stamp}`;
  const docB = `Dr B ${stamp}`;
  const cTok = jwt.sign({ id: 811, name: cns, role: 'counsellor', jobRole: 'Counsellor' }, S, { expiresIn: '1d' });

  await prisma.staff.createMany({ data: [
    { name: cns, role: 'Counsellor', status: 'Active', password: 'x', email: `cr${stamp}@x.com` },
    { name: docA, role: 'Oncologist', status: 'Active', password: 'x', specialties: 'Lung Cancer', email: `da${stamp}@x.com` },
    { name: docB, role: 'Oncologist', status: 'Active', password: 'x', specialties: 'Lung Cancer', email: `db${stamp}@x.com` },
  ] });
  const uhid = 'DBLR' + String(stamp).slice(-5);
  const patient = await prisma.patient.create({ data: { name: `Reassign Patient ${stamp}`, uhid, email: `rp${stamp}@x.com` } });
  await prisma.report.create({ data: { patientName: patient.name, patientUhid: uhid, type: 'Patient Upload', date: '21 Sep 2026', status: 'Pending Review' } });
  await prisma.secondOpinion.create({ data: { patientName: patient.name, patientUhid: uhid, status: 'Awaiting Review', priority: 'Normal', counsellorReport: 'Triage note.' } });

  const parseHist = async () => {
    const k = await prisma.secondOpinion.findFirst({ where: { patientUhid: uhid } });
    try { return JSON.parse(k.assignmentHistory || '[]'); } catch { return []; }
  };

  // ---- first assignment ----
  const a1 = await call('POST', `/counsellor/folders/${patient.id}/assign`, cTok, { doctor: docA, category: 'Lung Cancer' });
  check('first assignment succeeds', a1.status, 200);
  check('  case is with doctor A', a1.body.case.expert, docA);
  check('  case moved to Under Review', a1.body.case.status, 'Under Review');
  let hist = await parseHist();
  check('history has one entry', hist.length, 1);
  check('  it names doctor A', hist[0].doctor, docA);
  check('  with no previous specialist', hist[0].from, null);
  check('  and records the stage it was at', hist[0].stage, 'Awaiting Review');
  check('  and who moved it', hist[0].by, cns);

  // ---- reassignment ----
  const a2 = await call('POST', `/counsellor/folders/${patient.id}/assign`, cTok, { doctor: docB, category: 'Lung Cancer' });
  check('reassignment succeeds', a2.status, 200);
  check('  case is now with doctor B', a2.body.case.expert, docB);
  const reportDoc = (await prisma.report.findFirst({ where: { patientUhid: uhid } })).doctor;
  check('  the documents follow to doctor B', reportDoc, docB);
  hist = await parseHist();
  check('history now has two entries', hist.length, 2);
  check('  the second is a reassignment from A to B', [hist[1].from, hist[1].doctor], [docA, docB]);
  check('  recorded at the stage it was at (Under Review)', hist[1].stage, 'Under Review');

  // ---- the record is visible on the folder ----
  const folder = await call('GET', `/counsellor/folders/${patient.id}`, cTok);
  check('the folder carries the history', JSON.parse(folder.body.case.assignmentHistory || '[]').length, 2);

  // ---- the previous specialist and the audit log both know ----
  const notifA = await prisma.notification.findFirst({ where: { recipient: docA, title: { contains: 'reassigned from you' } } });
  check('doctor A is told the case left them', !!notifA, true);
  const audit = await prisma.activityLog.findFirst({ where: { action: { contains: `Reassigned ${patient.name}` } } });
  check('the reassignment is in the audit log', !!audit, true);

  await prisma.notification.deleteMany({ where: { recipient: { in: [uhid, docA, docB] } } });
  await prisma.report.deleteMany({ where: { patientUhid: uhid } });
  await prisma.secondOpinion.deleteMany({ where: { patientUhid: uhid } });
  await prisma.patient.deleteMany({ where: { uhid } });
  await prisma.staff.deleteMany({ where: { name: { in: [cns, docA, docB] } } });
  await prisma.$disconnect();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
