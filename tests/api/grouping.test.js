// The actual complaint: one patient uploading three files produced three cases.
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
  const get = async (p, token) => {
    const r = await fetch(B + p, { headers: { Authorization: 'Bearer ' + token } });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };

  const stamp = Date.now();
  const docName = `Dr Group ${stamp}`;
  const uhid = 'DBLG' + String(stamp).slice(-5);
  const dTok = jwt.sign({ id: 601, name: docName, role: 'doctor', jobRole: 'Oncologist' }, S, { expiresIn: '1d' });

  await prisma.staff.create({ data: { name: docName, role: 'Oncologist', status: 'Active', password: 'x', specialties: 'Lung Cancer', email: `g${stamp}@example.com` } });
  const patient = await prisma.patient.create({ data: { name: `Group Probe ${stamp}`, uhid, email: `gp${stamp}@example.com`, password: 'x' } });
  const pTok = jwt.sign({ id: patient.id, uhid, name: patient.name, role: 'patient' }, S, { expiresIn: '1d' });

  // One patient, three files of three different kinds — exactly the reported situation.
  for (const [type, url] of [['CT Scan', '/uploads/a.pdf'], ['Discharge Summary', '/uploads/b.docx'], ['Photo', '/uploads/c.jpg']]) {
    await prisma.report.create({ data: { patientName: patient.name, patientUhid: uhid, type, fileUrl: url, status: 'Pending Review', doctor: docName, category: 'Lung Cancer' } });
  }
  await prisma.secondOpinion.create({ data: { patientName: patient.name, patientUhid: uhid, expert: docName, cancerType: 'Lung Cancer', priority: 'High', status: 'Under Review', counsellor: 'Priya Nair', counsellorReport: 'Routing to thoracic.' } });

  const files = await prisma.report.count({ where: { patientUhid: uhid } });
  check('three files exist in the database', files, 3);

  // --- doctor ---
  const dc = await get('/doctor/cases', dTok);
  check('doctor endpoint responds', dc.status, 200);
  const mine = dc.body.filter((c) => c.uhid === uhid);
  check('the doctor sees ONE case, not three', mine.length, 1);
  check('  with all three files counted', mine[0].documents, 3);
  check('  all three marked pending', mine[0].pending, 3);
  check('  listing the document kinds', mine[0].types.sort(), ['CT Scan', 'Discharge Summary', 'Photo']);
  check('  carrying the category once', mine[0].category, 'Lung Cancer');
  check('  and the priority from the case', mine[0].priority, 'High');
  check('  shown as awaiting the opinion', mine[0].hasOpinion, false);

  // --- patient ---
  const pc = await get('/portal/cases', pTok);
  check('patient endpoint responds', pc.status, 200);
  check('the patient sees ONE case, not three', pc.body.length, 1);
  check('  with all three documents inside', pc.body[0].documents.length, 3);
  check('  named by their reference', pc.body[0].reference, uhid);
  check('  not yet delivered', pc.body[0].delivered, false);

  // The per-file Documents screen must still list every file — that one is meant to.
  const docsList = await get('/portal/reports', pTok);
  check('the Documents screen still lists each file', docsList.body.length, 3);

  await prisma.report.deleteMany({ where: { patientUhid: uhid } });
  await prisma.secondOpinion.deleteMany({ where: { patientUhid: uhid } });
  await prisma.patient.deleteMany({ where: { uhid } });
  await prisma.staff.deleteMany({ where: { name: docName } });
  await prisma.$disconnect();

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
