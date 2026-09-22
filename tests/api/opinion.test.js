// The specialist's half: write the opinion, gate it, send it, and check what the patient gets.
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
  const docName = `Dr Opinion ${stamp}`;
  const uhid = 'DBLO' + String(stamp).slice(-5);
  const email = `op${stamp}@example.com`;
  const dTok = jwt.sign({ id: 701, name: docName, role: 'doctor', jobRole: 'Oncologist' }, S, { expiresIn: '1d' });
  const cTok = jwt.sign({ id: 702, name: 'Priya Nair', role: 'counsellor', jobRole: 'Counsellor' }, S, { expiresIn: '1d' });
  const otherDoc = jwt.sign({ id: 703, name: 'Dr Nobody', role: 'doctor' }, S, { expiresIn: '1d' });

  await prisma.staff.create({ data: { name: docName, role: 'Oncologist', status: 'Active', password: 'x', specialties: 'Lung Cancer', email: `s${stamp}@example.com` } });
  const patient = await prisma.patient.create({ data: { name: `Opinion Probe ${stamp}`, uhid, email, status: 'New Patient', password: 'x' } });
  await prisma.report.create({ data: { patientName: patient.name, patientUhid: uhid, type: 'CT Scan', status: 'Pending Review', fileUrl: '/uploads/x.pdf', aiSummary: 'Left upper lobe mass 3.1 cm.' } });
  const pTok = jwt.sign({ id: patient.id, uhid, name: patient.name, email, role: 'patient' }, S, { expiresIn: '1d' });
  const adminTok = jwt.sign({ id: 1, email: 'a@b.com', name: 'Admin', role: 'admin' }, S, { expiresIn: '1d' });

  // Counsellor routes the case so the doctor owns it.
  await call('PUT', `/counsellor/folders/${patient.id}/report`, cTok, { report: 'Suspected lung primary.', cancerType: 'Lung Cancer' });
  await call('POST', `/counsellor/folders/${patient.id}/assign`, cTok, { doctor: docName, category: 'Lung Cancer' });

  // --- ownership ---
  check('another doctor cannot save an opinion', (await call('PUT', `/doctor/cases/${uhid}/opinion`, otherDoc, { opinion: 'x' })).status, 404);
  check('a counsellor cannot use the doctor route', (await call('PUT', `/doctor/cases/${uhid}/opinion`, cTok, { opinion: 'x' })).status, 403);

  // --- cannot submit before writing ---
  const early = await call('POST', `/doctor/cases/${uhid}/submit`, dTok);
  check('submitting before writing is refused', early.status, 400);
  check('  and says why', /save your opinion/i.test(early.body.error || ''), true);

  // --- patient sees nothing yet ---
  check('patient sees no opinion before it is sent', (await call('GET', '/portal/opinions', pTok)).body.length, 0);

  // --- write and save ---
  const saved = await call('PUT', `/doctor/cases/${uhid}/opinion`, dTok, { opinion: 'SUMMARY OF THE CASE\nLeft upper lobe mass. I agree with the referral.' });
  check('opinion saved', saved.status, 200);
  check('  stored', /Left upper lobe mass/.test(saved.body.case.doctorOpinion || ''), true);
  check('  not yet delivered', saved.body.case.status, 'Under Review');
  check('patient still sees nothing', (await call('GET', '/portal/opinions', pTok)).body.length, 0);
  const caseId = saved.body.case.id;

  // --- doctor submits for admin review; this must NOT reach the patient ---
  const submitted = await call('POST', `/doctor/cases/${uhid}/submit`, dTok);
  check('submitted for review', submitted.status, 200);
  check('  case marked Pending Approval', submitted.body.case.status, 'Pending Approval');
  check('patient still sees nothing after submission', (await call('GET', '/portal/opinions', pTok)).body.length, 0);

  // --- admin reviews and delivers; only now does the patient get it ---
  const sent = await call('POST', `/second-opinions/${caseId}/deliver`, adminTok);
  check('admin delivers', sent.status, 200);
  check('  case marked Delivered', sent.body.case.status, 'Delivered');
  check('  timestamped', !!sent.body.case.deliveredAt, true);

  const docs = await prisma.report.findMany({ where: { patientUhid: uhid } });
  check('  the reports are marked Reviewed', docs.every((d) => d.status === 'Reviewed'), true);

  // --- now the patient can read it ---
  const mine = await call('GET', '/portal/opinions', pTok);
  check('patient can read the opinion', mine.body.length, 1);
  check('  the text is there', /Left upper lobe mass/.test(mine.body[0].opinion || ''), true);
  check('  the doctor is named', mine.body[0].doctor, docName);
  check("  the counsellor's internal note is NOT exposed", JSON.stringify(mine.body).includes('Suspected lung primary'), false);

  // --- another patient must not see it ---
  const strangerTok = jwt.sign({ id: 999, uhid: 'DBLZZZZZ', name: 'Someone Else', role: 'patient' }, S, { expiresIn: '1d' });
  check('a different patient sees nothing', (await call('GET', '/portal/opinions', strangerTok)).body.length, 0);

  await prisma.report.deleteMany({ where: { patientUhid: uhid } });
  await prisma.secondOpinion.deleteMany({ where: { patientUhid: uhid } });
  await prisma.patient.deleteMany({ where: { uhid } });
  await prisma.staff.deleteMany({ where: { name: docName } });
  await prisma.$disconnect();

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
