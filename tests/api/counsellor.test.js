// Exercises the counsellor stage end to end against a running server + real database.
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
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };

  const stamp = Date.now();
  const counsellorTok = jwt.sign({ id: 901, name: 'Test Counsellor', role: 'counsellor', jobRole: 'Counsellor' }, S, { expiresIn: '1d' });
  const doctorTok = jwt.sign({ id: 902, name: `Dr Probe ${stamp}`, role: 'doctor', jobRole: 'Oncologist' }, S, { expiresIn: '1d' });
  const patientTok = jwt.sign({ id: 903, uhid: 'DBLX', name: 'P', role: 'patient' }, S, { expiresIn: '1d' });

  // Fixtures: a specialist who covers a category, a patient, and one uploaded document.
  const docName = `Dr Probe ${stamp}`;
  const uhid = 'DBLT' + String(stamp).slice(-5);
  await prisma.staff.create({ data: { name: docName, role: 'Oncologist', status: 'Active', password: 'x', specialties: 'Lung Cancer', email: `probe${stamp}@example.com` } });
  const patient = await prisma.patient.create({ data: { name: `Folder Probe ${stamp}`, uhid, status: 'New Patient' } });
  const doc = await prisma.report.create({ data: { patientName: patient.name, patientUhid: uhid, type: 'CT Scan', status: 'Pending Review', fileUrl: '/uploads/none.pdf' } });

  // --- who may reach this portal ---
  check('no token refused', (await call('GET', '/counsellor/folders')).status, 401);
  check('patient token refused', (await call('GET', '/counsellor/folders', patientTok)).status, 403);
  check('doctor token refused', (await call('GET', '/counsellor/folders', doctorTok)).status, 403);
  check('counsellor admitted', (await call('GET', '/counsellor/folders', counsellorTok)).status, 200);

  // --- dashboard + folder list ---
  const sum = await call('GET', '/counsellor/summary', counsellorTok);
  check('summary returns counters', typeof sum.body.patients === 'number' && typeof sum.body.awaitingTriage === 'number', true);

  const folders = await call('GET', '/counsellor/folders?q=Folder+Probe', counsellorTok);
  const mine = folders.body.find((x) => x.uhid === uhid);
  check('the patient has a folder', !!mine, true);
  check('  with their document counted', mine && mine.documents, 1);
  check('  flagged as untriaged', mine && mine.untriaged, 1);
  check('  with no report yet', mine && mine.hasReport, false);

  // --- opening the folder ---
  const folder = await call('GET', `/counsellor/folders/${patient.id}`, counsellorTok);
  check('folder opens', folder.status, 200);
  check('  documents are listed', folder.body.documents.length, 1);
  check('  the specialist is offered', folder.body.doctors.some((d) => d.name === docName), true);
  check('  categories are offered', folder.body.categories.includes('Lung Cancer'), true);

  // --- a doctor cannot be assigned before the report exists ---
  const early = await call('POST', `/counsellor/folders/${patient.id}/assign`, counsellorTok, { doctor: docName, category: 'Lung Cancer' });
  check('assigning before writing the report is refused', early.status, 400);
  check('  and says why', /case report before assigning/.test(early.body.error || ''), true);

  // --- the draft needs an AI reading to build from ---
  const noDraft = await call('POST', `/counsellor/folders/${patient.id}/draft`, counsellorTok);
  check('draft refused with nothing read yet', noDraft.status, 400);

  // Simulate the AI having read the document.
  await prisma.report.update({ where: { id: doc.id }, data: { aiSummary: 'Left upper lobe mass, 3.1 cm.' } });
  const draft = await call('POST', `/counsellor/folders/${patient.id}/draft`, counsellorTok);
  check('draft built once a document is read', draft.status, 200);
  check('  draft quotes the reading', /Left upper lobe mass/.test(draft.body.draft || ''), true);
  check('  draft is stored on the case', /Left upper lobe mass/.test((draft.body.case || {}).aiDraft || ''), true);

  // --- save the counsellor's own report ---
  const saved = await call('PUT', `/counsellor/folders/${patient.id}/report`, counsellorTok, {
    report: 'Reviewed CT. Suspected lung primary. Route to thoracic oncology.',
    cancerType: 'Lung Cancer', priority: 'High',
  });
  check('report saved', saved.status, 200);
  check('  attributed to the counsellor', saved.body.case.counsellor, 'Test Counsellor');
  check('  priority recorded', saved.body.case.priority, 'High');

  // --- now the assignment is allowed ---
  const assign = await call('POST', `/counsellor/folders/${patient.id}/assign`, counsellorTok, { doctor: docName, category: 'Lung Cancer' });
  check('assignment accepted', assign.status, 200);
  check('  case moves to Under Review', assign.body.case.status, 'Under Review');
  check('  expert recorded', assign.body.case.expert, docName);

  const docAfter = await prisma.report.findUnique({ where: { id: doc.id } });
  check('  the document is routed to the doctor', docAfter.doctor, docName);
  check('  and categorised', docAfter.category, 'Lung Cancer');

  // --- the doctor receives the handover ---
  const handover = await call('GET', `/doctor/cases/${uhid}`, doctorTok);
  check('doctor can open the case', handover.status, 200);
  check("  sees the counsellor's report", /Suspected lung primary/.test(handover.body.counsellorReport || ''), true);
  check('  sees who wrote it', handover.body.counsellor, 'Test Counsellor');
  check("  sees the patient's documents", handover.body.documents.length, 1);

  // --- another doctor must not ---
  const otherTok = jwt.sign({ id: 904, name: 'Dr Someone Else', role: 'doctor' }, S, { expiresIn: '1d' });
  check('a different doctor cannot open it', (await call('GET', `/doctor/cases/${uhid}`, otherTok)).status, 404);
  check('a counsellor token cannot use the doctor route', (await call('GET', `/doctor/cases/${uhid}`, counsellorTok)).status, 403);

  // cleanup
  await prisma.report.deleteMany({ where: { patientUhid: uhid } });
  await prisma.secondOpinion.deleteMany({ where: { patientUhid: uhid } });
  await prisma.patient.deleteMany({ where: { uhid } });
  await prisma.staff.deleteMany({ where: { name: docName } });
  await prisma.$disconnect();

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
