// Admin oversight: one screen per person, including the doctor-patient conversation.
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
  const docName = `Dr Oversight ${stamp}`;
  const cnsName = `Cns Oversight ${stamp}`;
  const uhid = 'DBLV' + String(stamp).slice(-5);
  const adminTok = jwt.sign({ id: 1, email: 'a@b.com', name: 'Admin', role: 'admin' }, S, { expiresIn: '1d' });
  const dTok = jwt.sign({ id: 311, name: docName, role: 'doctor', jobRole: 'Oncologist' }, S, { expiresIn: '1d' });
  const cTok = jwt.sign({ id: 312, name: cnsName, role: 'counsellor', jobRole: 'Counsellor' }, S, { expiresIn: '1d' });

  const staff = await prisma.staff.create({ data: { name: docName, role: 'Oncologist', status: 'Active', password: 'x', specialties: 'Lung Cancer', email: `o${stamp}@x.com`, qualifications: 'MBBS, MD' } });
  await prisma.staff.create({ data: { name: cnsName, role: 'Counsellor', status: 'Active', password: 'x', email: `oc${stamp}@x.com` } });
  const patient = await prisma.patient.create({ data: { name: `Oversight Probe ${stamp}`, uhid, email: `op${stamp}@x.com`, password: 'x' } });
  const pTok = jwt.sign({ id: patient.id, uhid, name: patient.name, role: 'patient' }, S, { expiresIn: '1d' });
  await prisma.report.create({ data: { patientName: patient.name, patientUhid: uhid, type: 'CT Scan', fileUrl: '/uploads/a.pdf', status: 'Pending Review' } });

  // run the case through so there is something to oversee
  await call('PUT', `/counsellor/folders/${patient.id}/report`, cTok, { report: 'Internal triage note.', cancerType: 'Lung Cancer' });
  await call('POST', `/counsellor/folders/${patient.id}/assign`, cTok, { doctor: docName, category: 'Lung Cancer' });
  await call('POST', `/doctor/messages/${uhid}`, dTok, { body: 'Doctor to patient message.' });
  await call('POST', '/portal/messages', pTok, { body: 'Patient reply.' });
  const savedOp = await call('PUT', `/doctor/cases/${uhid}/opinion`, dTok, { opinion: 'The doctor opinion text.' });
  await call('POST', `/doctor/cases/${uhid}/submit`, dTok);                                  // doctor submits
  await call('POST', `/second-opinions/${savedOp.body.case.id}/deliver`, adminTok);           // admin delivers

  // ---- access ----
  console.log('\n--- who may read a profile ---');
  check('anonymous refused', (await call('GET', `/profiles/patient/${patient.id}`)).status, 401);
  check('patient refused', (await call('GET', `/profiles/patient/${patient.id}`, pTok)).status, 403);
  check('doctor refused', (await call('GET', `/profiles/patient/${patient.id}`, dTok)).status, 403);
  check('counsellor refused', (await call('GET', `/profiles/patient/${patient.id}`, cTok)).status, 403);
  check('admin admitted', (await call('GET', `/profiles/patient/${patient.id}`, adminTok)).status, 200);

  // ---- patient profile ----
  console.log('\n--- admin opens a patient by name ---');
  const pp = (await call('GET', `/profiles/patient/${patient.id}`, adminTok)).body;
  check('the patient record is there', pp.patient.uhid, uhid);
  check('  password hash is NOT returned', Object.keys(pp.patient).includes('password'), false);
  check('  but whether they have a login is', pp.hasPassword, true);
  check('  their documents are listed', pp.documents.length, 1);
  check("  the counsellor's internal note is visible to admin", /Internal triage note/.test(pp.case.counsellorReport || ''), true);
  check("  the doctor's opinion is visible", /The doctor opinion text/.test(pp.case.doctorOpinion || ''), true);
  check('  the doctor-patient conversation is visible', pp.messages.length, 2);
  check('    including who wrote each side', pp.messages.map((m) => m.author || 'patient').sort(), [docName, 'patient'].sort());

  // ---- staff profile ----
  console.log('\n--- admin opens a doctor by name ---');
  const sp = (await call('GET', `/profiles/staff/${staff.id}`, adminTok)).body;
  check('the staff record is there', sp.staff.name, docName);
  check('  password hash is NOT returned', Object.keys(sp.staff).includes('password'), false);
  check('  their categories are listed', sp.categories, ['Lung Cancer']);
  check('  their patients are listed', sp.patients.some((p) => p.uhid === uhid), true);
  check('  opinions delivered counted', sp.counts.delivered, 1);
  check('  documents counted', sp.counts.documents, 1);

  const cns = await prisma.staff.findFirst({ where: { name: cnsName } });
  const cp = (await call('GET', `/profiles/staff/${cns.id}`, adminTok)).body;
  check('a counsellor profile counts what they triaged', cp.counts.triaged, 1);

  // ---- missing records ----
  check('an unknown patient is a 404', (await call('GET', '/profiles/patient/99999999', adminTok)).status, 404);
  check('an unknown staff member is a 404', (await call('GET', '/profiles/staff/99999999', adminTok)).status, 404);

  // ---- the patient's own opinion page still works ----
  console.log('\n--- and the patient can read their opinion ---');
  const mine = (await call('GET', '/portal/opinions', pTok)).body;
  check('the opinion is available to the patient', mine.length, 1);
  check('  with the text', /The doctor opinion text/.test(mine[0].opinion || ''), true);
  check("  and NOT the counsellor's internal note", JSON.stringify(mine).includes('Internal triage note'), false);

  await prisma.notification.deleteMany({ where: { OR: [{ recipient: uhid }, { recipient: docName }, { recipient: cnsName }] } });
  await prisma.message.deleteMany({ where: { patientUhid: uhid } });
  await prisma.report.deleteMany({ where: { patientUhid: uhid } });
  await prisma.secondOpinion.deleteMany({ where: { patientUhid: uhid } });
  await prisma.patient.deleteMany({ where: { uhid } });
  await prisma.staff.deleteMany({ where: { name: { in: [docName, cnsName] } } });
  await prisma.$disconnect();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
