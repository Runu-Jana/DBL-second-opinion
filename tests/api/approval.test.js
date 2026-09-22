// The doctor no longer sends the opinion to the patient. They submit it; an admin reviews it, may
// edit it, and only the admin's send reaches the patient.
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
  const docName = `Dr Approve ${stamp}`;
  const cnsName = `Cns Approve ${stamp}`;
  const email = `ap${stamp}@example.com`;
  const uhid = 'DBLAP' + String(stamp).slice(-5);
  const dTok = jwt.sign({ id: 501, name: docName, role: 'doctor', jobRole: 'Oncologist' }, S, { expiresIn: '1d' });
  const cTok = jwt.sign({ id: 502, name: cnsName, role: 'counsellor', jobRole: 'Counsellor' }, S, { expiresIn: '1d' });
  const adminTok = jwt.sign({ id: 1, email: 'a@b.com', name: 'Admin', role: 'admin' }, S, { expiresIn: '1d' });

  await prisma.staff.createMany({ data: [
    { name: docName, role: 'Oncologist', status: 'Active', password: 'x', specialties: 'Lung Cancer', email: `d${stamp}@x.com` },
    { name: cnsName, role: 'Counsellor', status: 'Active', password: 'x', email: `c${stamp}@x.com` },
  ] });
  const patient = await prisma.patient.create({ data: { name: `Approve Patient ${stamp}`, uhid, email, password: 'x' } });
  const pTok = jwt.sign({ id: patient.id, uhid, name: patient.name, email, role: 'patient' }, S, { expiresIn: '1d' });
  await prisma.report.create({ data: { patientName: patient.name, patientUhid: uhid, type: 'CT Scan', status: 'Pending Review', fileUrl: '/uploads/x.pdf' } });
  await call('PUT', `/counsellor/folders/${patient.id}/report`, cTok, { report: 'Triage note.', cancerType: 'Lung Cancer' });
  await call('POST', `/counsellor/folders/${patient.id}/assign`, cTok, { doctor: docName, category: 'Lung Cancer' });

  // ---- doctor writes and submits ----
  const saved = await call('PUT', `/doctor/cases/${uhid}/opinion`, dTok, { opinion: 'ORIGINAL opinion from the doctor.' });
  const caseId = saved.body.case.id;
  const submitted = await call('POST', `/doctor/cases/${uhid}/submit`, dTok);
  check('doctor submits for review', submitted.status, 200);
  check('  case is Pending Approval, not Delivered', submitted.body.case.status, 'Pending Approval');
  check('the patient sees no opinion yet', (await call('GET', '/portal/opinions', pTok)).body.length, 0);
  check('  and no "ready" notification yet', (await call('GET', '/notifications/mine', pTok)).body.items.some((n) => /opinion is ready/.test(n.title)), false);

  // ---- the admin can see it under the patient ----
  const prof = await call('GET', `/profiles/patient/${patient.id}`, adminTok);
  check('the admin sees the submitted opinion on the profile', prof.body.case.status, 'Pending Approval');
  check('  with the doctor text', prof.body.case.doctorOpinion, 'ORIGINAL opinion from the doctor.');

  // ---- only an admin may edit or deliver ----
  check('a doctor cannot deliver', (await call('POST', `/second-opinions/${caseId}/deliver`, dTok)).status, 403);
  check('a patient cannot deliver', (await call('POST', `/second-opinions/${caseId}/deliver`, pTok)).status, 403);
  check('a doctor cannot edit via the admin route', (await call('PUT', `/second-opinions/${caseId}/opinion`, dTok, { opinion: 'x' })).status, 403);

  // ---- admin edits, then sends ----
  const edited = await call('PUT', `/second-opinions/${caseId}/opinion`, adminTok, { opinion: 'EDITED by the admin before sending.' });
  check('admin edits the opinion', edited.status, 200);
  const delivered = await call('POST', `/second-opinions/${caseId}/deliver`, adminTok);
  check('admin delivers it', delivered.status, 200);
  check('  case is now Delivered', delivered.body.case.status, 'Delivered');

  // ---- the patient now gets the admin-edited version ----
  const ops = await call('GET', '/portal/opinions', pTok);
  check('the patient can now read the opinion', ops.body.length, 1);
  check('  and it is the admin-edited text', ops.body[0].opinion, 'EDITED by the admin before sending.');
  check('  the doctor is still named', ops.body[0].doctor, docName);
  check('the patient is notified it is ready', (await call('GET', '/notifications/mine', pTok)).body.items.some((n) => /opinion is ready/.test(n.title)), true);
  check('the reports are marked reviewed', (await prisma.report.count({ where: { patientUhid: uhid, status: 'Reviewed' } })) > 0, true);

  // ---- delivering with nothing to send is refused ----
  const empty = await prisma.secondOpinion.create({ data: { patientName: 'Empty', patientUhid: 'DBLEMPTY', status: 'Under Review' } });
  check('delivering an empty opinion is refused', (await call('POST', `/second-opinions/${empty.id}/deliver`, adminTok)).status, 400);
  await prisma.secondOpinion.delete({ where: { id: empty.id } });

  await prisma.notification.deleteMany({ where: { recipient: { in: [uhid, docName, cnsName] } } });
  await prisma.report.deleteMany({ where: { patientUhid: uhid } });
  await prisma.secondOpinion.deleteMany({ where: { patientUhid: uhid } });
  await prisma.patient.deleteMany({ where: { uhid } });
  await prisma.staff.deleteMany({ where: { name: { in: [docName, cnsName] } } });
  await prisma.$disconnect();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
