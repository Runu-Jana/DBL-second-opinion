// The patient's own questions, asked at upload, must reach everyone who works the case.
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
  const upload = async (name, email, questions, label) => {
    const fd = new FormData();
    fd.append('patientName', name);
    if (email) fd.append('email', email);
    if (questions) fd.append('questions', questions);
    fd.append('reports', new Blob([Buffer.alloc(256, 1)], { type: 'application/pdf' }), `${label}.pdf`);
    const r = await fetch(B + '/upload/report', { method: 'POST', body: fd });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };

  const stamp = Date.now();
  const docName = `Dr Q ${stamp}`;
  const cnsName = `Cns Q ${stamp}`;
  const email = `q${stamp}@example.com`;
  const adminTok = jwt.sign({ id: 1, email: 'a@b.com', name: 'Admin', role: 'admin' }, S, { expiresIn: '1d' });
  const dTok = jwt.sign({ id: 321, name: docName, role: 'doctor', jobRole: 'Oncologist' }, S, { expiresIn: '1d' });
  const cTok = jwt.sign({ id: 322, name: cnsName, role: 'counsellor', jobRole: 'Counsellor' }, S, { expiresIn: '1d' });

  await prisma.staff.createMany({ data: [
    { name: docName, role: 'Oncologist', status: 'Active', password: 'x', specialties: 'Lung Cancer', email: `dq${stamp}@x.com` },
    { name: cnsName, role: 'Counsellor', status: 'Active', password: 'x', email: `cq${stamp}@x.com` },
  ] });
  const patient = await prisma.patient.create({ data: { name: `Question Probe ${stamp}`, uhid: 'DBLQ' + String(stamp).slice(-5), email, password: 'x' } });
  const uhid = patient.uhid;

  const Q1 = 'Is surgery necessary, or can this be watched? What are the side effects of chemo?';

  // ---- upload with questions ----
  const up = await upload(patient.name, email, Q1, 'scan');
  check('upload with questions succeeds', up.status, 201);
  check('  and links to this patient', up.body.patientUhid, uhid);

  const kase = await prisma.secondOpinion.findFirst({ where: { patientUhid: uhid } });
  check('a case was opened to hold them', !!kase, true);
  check('  with the questions stored', kase.patientQuestions, Q1);

  // ---- the counsellor sees them ----
  const folder = await call('GET', `/counsellor/folders/${patient.id}`, cTok);
  check('the counsellor sees the questions', folder.body.case.patientQuestions, Q1);

  // ---- a second upload adds rather than overwrites ----
  const Q2 = 'Also: how soon would treatment need to start?';
  await upload(patient.name, email, Q2, 'scan2');
  const after = await prisma.secondOpinion.findFirst({ where: { patientUhid: uhid } });
  check('a later upload keeps the first questions', after.patientQuestions.includes(Q1), true);
  check('  and appends the new ones', after.patientQuestions.includes(Q2), true);

  // ---- the doctor receives them with the handover ----
  await call('PUT', `/counsellor/folders/${patient.id}/report`, cTok, { report: 'Triage note.', cancerType: 'Lung Cancer' });
  await call('POST', `/counsellor/folders/${patient.id}/assign`, cTok, { doctor: docName, category: 'Lung Cancer' });
  const handover = await call('GET', `/doctor/cases/${uhid}`, dTok);
  check('the doctor receives the questions', handover.body.patientQuestions.includes(Q1), true);

  // ---- admin sees them on the profile ----
  const prof = await call('GET', `/profiles/patient/${patient.id}`, adminTok);
  check('admin sees them on the patient profile', prof.body.case.patientQuestions.includes(Q1), true);

  // ---- the AI draft is told about them, and asked to answer ----
  const { buildPrompt } = require(ROOT + '/server/lib/opinionAI');
  const withQ = buildPrompt({ patientName: patient.name, readings: [], patientQuestions: Q1 });
  check('the draft prompt carries the questions', withQ.includes(Q1), true);
  check('  and asks for an answers section', withQ.includes('ANSWERS TO YOUR QUESTIONS'), true);
  const withoutQ = buildPrompt({ patientName: patient.name, readings: [] });
  check('  which is absent when nothing was asked', withoutQ.includes('ANSWERS TO YOUR QUESTIONS'), false);

  // ---- the patient gets them back, on the case and beside the opinion ----
  const pTok = jwt.sign({ id: patient.id, uhid, name: patient.name, email, role: 'patient' }, S, { expiresIn: '1d' });
  const cases = await call('GET', '/portal/cases', pTok);
  check('the patient sees their questions on the case', (cases.body[0]?.patientQuestions || '').includes(Q1), true);
  const savedOp = await call('PUT', `/doctor/cases/${uhid}/opinion`, dTok, { opinion: 'ANSWERS TO YOUR QUESTIONS\nSurgery: not on this evidence.' });
  await call('POST', `/doctor/cases/${uhid}/submit`, dTok);            // doctor submits for review
  const sent = await call('POST', `/second-opinions/${savedOp.body.case.id}/deliver`, adminTok);   // admin delivers
  check('the opinion is delivered', sent.status, 200);
  const ops = await call('GET', '/portal/opinions', pTok);
  check('  and the questions sit beside it', (ops.body[0]?.patientQuestions || '').includes(Q1), true);

  // ---- uploading without questions must still work ----
  const p2 = await prisma.patient.create({ data: { name: `No Q ${stamp}`, uhid: 'DBLN' + String(stamp).slice(-5), email: `nq${stamp}@x.com` } });
  const noQ = await upload(p2.name, `nq${stamp}@x.com`, '', 'plain');
  check('uploading with no questions still works', noQ.status, 201);
  const k2 = await prisma.secondOpinion.findFirst({ where: { patientUhid: p2.uhid } });
  check('  and opens no empty case for them', k2, null);

  // ---- overly long input is capped, not rejected ----
  const p3 = await prisma.patient.create({ data: { name: `Long Q ${stamp}`, uhid: 'DBLZ' + String(stamp).slice(-5), email: `lq${stamp}@x.com` } });
  const long = await upload(p3.name, `lq${stamp}@x.com`, 'x'.repeat(9000), 'long');
  check('a very long question is accepted', long.status, 201);
  const k3 = await prisma.secondOpinion.findFirst({ where: { patientUhid: p3.uhid } });
  check('  and stored capped at 4000 characters', k3.patientQuestions.length, 4000);

  const uhids = [uhid, p2.uhid, p3.uhid];
  await prisma.notification.deleteMany({ where: { recipient: { in: [...uhids, docName, cnsName] } } });
  await prisma.report.deleteMany({ where: { patientUhid: { in: uhids } } });
  await prisma.secondOpinion.deleteMany({ where: { patientUhid: { in: uhids } } });
  await prisma.patient.deleteMany({ where: { uhid: { in: uhids } } });
  await prisma.staff.deleteMany({ where: { name: { in: [docName, cnsName] } } });
  await prisma.$disconnect();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
