// Walks the whole handover: counsellor writes + assigns, doctor opens it in their own portal.
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
      method: m,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };

  const stamp = Date.now();
  const docName = `Dr Handover ${stamp}`;
  const uhid = 'DBLH' + String(stamp).slice(-5);
  const cTok = jwt.sign({ id: 801, name: 'Priya Nair', role: 'counsellor', jobRole: 'Counsellor' }, S, { expiresIn: '1d' });
  const dTok = jwt.sign({ id: 802, name: docName, role: 'doctor', jobRole: 'Oncologist' }, S, { expiresIn: '1d' });

  await prisma.staff.create({ data: { name: docName, role: 'Oncologist', status: 'Active', password: 'x', specialties: 'Breast Cancer', email: `h${stamp}@example.com` } });
  const patient = await prisma.patient.create({ data: { name: `Handover Probe ${stamp}`, uhid, status: 'New Patient' } });
  await prisma.report.create({ data: { patientName: patient.name, patientUhid: uhid, type: 'Mammogram', status: 'Pending Review', fileUrl: '/uploads/x.pdf', aiSummary: 'Irregular mass, right breast, 2.2 cm.' } });

  // Before assignment the doctor sees nothing.
  check('doctor sees no patients yet', (await call('GET', '/doctor/patients', dTok)).body.length, 0);
  check('doctor cannot open the case yet', (await call('GET', `/doctor/cases/${uhid}`, dTok)).status, 404);

  // Counsellor works the folder.
  await call('PUT', `/counsellor/folders/${patient.id}/report`, cTok, {
    report: 'Mammogram shows an irregular right breast mass. Needs surgical oncology review.',
    cancerType: 'Breast Cancer', priority: 'Urgent',
  });
  const assigned = await call('POST', `/counsellor/folders/${patient.id}/assign`, cTok, { doctor: docName, category: 'Breast Cancer' });
  check('counsellor assigns the case', assigned.status, 200);

  // Now the doctor has it.
  const mine = await call('GET', '/doctor/patients', dTok);
  check('patient appears in the doctor\'s list', mine.body.some((p) => p.uhid === uhid), true);
  const reports = await call('GET', '/doctor/reports', dTok);
  check('documents appear in the doctor\'s reports', reports.body.some((r) => r.patientUhid === uhid), true);

  const h = await call('GET', `/doctor/cases/${uhid}`, dTok);
  check('handover opens', h.status, 200);
  check('  counsellor report is there', /irregular right breast mass/i.test(h.body.counsellorReport || ''), true);
  check('  author named', h.body.counsellor, 'Priya Nair');
  check('  priority carried over', h.body.priority, 'Urgent');
  check('  cancer type carried over', h.body.cancerType, 'Breast Cancer');
  check('  patient attached', h.body.patient && h.body.patient.uhid, uhid);
  check('  documents attached', h.body.documents.length, 1);
  check("  the AI reading travels with it", /Irregular mass/.test(h.body.documents[0].aiSummary || ''), true);

  await prisma.report.deleteMany({ where: { patientUhid: uhid } });
  await prisma.secondOpinion.deleteMany({ where: { patientUhid: uhid } });
  await prisma.patient.deleteMany({ where: { uhid } });
  await prisma.staff.deleteMany({ where: { name: docName } });
  await prisma.$disconnect();

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
