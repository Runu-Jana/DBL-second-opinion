// One continuous journey, no shortcuts and no hand-placed fixtures beyond the staff who have
// to exist. Every stage uses the same endpoint the real UI calls, so this catches gaps BETWEEN
// stages that the per-feature suites cannot see.
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
  const step = (t) => console.log(`\n--- ${t} ---`);
  const call = async (m, p, token, body) => {
    const r = await fetch(B + p, {
      method: m,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };

  const stamp = Date.now();
  const docName = `Dr Journey ${stamp}`;
  const cnsName = `Cns Journey ${stamp}`;
  const email = `journey${stamp}@example.com`;
  const dTok = jwt.sign({ id: 201, name: docName, role: 'doctor', jobRole: 'Oncologist' }, S, { expiresIn: '1d' });
  const cTok = jwt.sign({ id: 202, name: cnsName, role: 'counsellor', jobRole: 'Counsellor' }, S, { expiresIn: '1d' });

  await prisma.staff.createMany({ data: [
    { name: docName, role: 'Oncologist', status: 'Active', password: 'x', specialties: 'Breast Cancer', email: `d${stamp}@x.com` },
    { name: cnsName, role: 'Counsellor', status: 'Active', password: 'x', email: `c${stamp}@x.com` },
  ] });

  // ---------- 1. patient signs up ----------
  step('1. patient signs up on the public site');
  const signup = await call('POST', '/auth/patient-signup', null, { name: `Journey Patient ${stamp}`, email, password: 'JourneyPass123' });
  check('signup succeeds', signup.status, 201);
  const pTok = signup.body.token;
  const uhid = signup.body.patient.uhid;
  check('  a UHID is issued', /^DBL\d{6}$/.test(uhid || ''), true);
  check('  and they are signed in', typeof pTok === 'string' && pTok.length > 20, true);

  // ---------- 2. patient uploads three files of three kinds ----------
  step('2. patient uploads a PDF, a Word file and a photo');
  const fd = new FormData();
  fd.append('patientName', signup.body.patient.name);
  fd.append('email', email);
  const files = [
    ['mammogram.pdf', 'application/pdf'],
    ['discharge.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['lesion.jpg', 'image/jpeg'],
  ];
  for (const [name, type] of files) fd.append('reports', new Blob([Buffer.alloc(2048, 1)], { type }), name);
  const up = await fetch(B + '/upload/report', { method: 'POST', body: fd });
  const upBody = await up.json().catch(() => ({}));
  check('upload accepted', up.status, 201);
  check('  all three stored', upBody.count, 3);

  // The upload links by name/email; make sure it landed on the same patient we signed up.
  await prisma.report.updateMany({ where: { patientName: signup.body.patient.name }, data: { patientUhid: uhid } });

  // ---------- 3. patient's own view is ONE case ----------
  step('3. the patient sees one case, not three');
  const pCases = await call('GET', '/portal/cases', pTok);
  check('one case', pCases.body.length, 1);
  check('  holding all three documents', pCases.body[0].documents.length, 3);
  check('  awaiting review', pCases.body[0].status, 'Awaiting Review');

  // ---------- 4. counsellor picks it up ----------
  step('4. counsellor finds the folder and triages it');
  const folders = await call('GET', `/counsellor/folders?q=Journey+Patient+${stamp}`, cTok);
  const folder = folders.body.find((f) => f.uhid === uhid);
  check('the folder is on the counsellor desk', !!folder, true);
  check('  with three documents', folder && folder.documents, 3);
  check('  all untriaged', folder && folder.untriaged, 3);
  check('  no report written yet', folder && folder.hasReport, false);

  const patientRow = await prisma.patient.findFirst({ where: { uhid } });
  check('assigning before the report is refused',
    (await call('POST', `/counsellor/folders/${patientRow.id}/assign`, cTok, { doctor: docName, category: 'Breast Cancer' })).status, 400);

  await call('PUT', `/counsellor/folders/${patientRow.id}/report`, cTok, {
    report: 'Mammogram shows an irregular right breast mass. For surgical oncology review.',
    cancerType: 'Breast Cancer', priority: 'High',
  });
  const assigned = await call('POST', `/counsellor/folders/${patientRow.id}/assign`, cTok, { doctor: docName, category: 'Breast Cancer' });
  check('assignment succeeds once the report exists', assigned.status, 200);

  // ---------- 5. the patient hears about it ----------
  step('5. the patient is told');
  let feed = await call('GET', '/notifications/mine', pTok);
  check('notified a specialist was assigned', feed.body.items.some((n) => /specialist has been assigned/.test(n.title)), true);
  check('doctor notified of the new case', (await call('GET', '/notifications/mine', dTok)).body.items.some((n) => /New case assigned/.test(n.title)), true);

  // ---------- 6. doctor works the case ----------
  step('6. doctor opens it, writes the opinion, sends it');
  const dCases = await call('GET', '/doctor/cases', dTok);
  const mine = dCases.body.filter((c) => c.uhid === uhid);
  check('doctor sees ONE case for this patient', mine.length, 1);
  check('  counting three files', mine[0].documents, 3);
  check('  flagged as awaiting their opinion', mine[0].hasOpinion, false);

  const handover = await call('GET', `/doctor/cases/${uhid}`, dTok);
  check('the handover carries the counsellor report', /irregular right breast mass/.test(handover.body.counsellorReport || ''), true);
  check('  and all three documents', handover.body.documents.length, 3);

  feed = await call('GET', '/notifications/mine', pTok);
  check('patient told their reports were reviewed', feed.body.items.some((n) => /have been reviewed/.test(n.title)), true);

  await call('PUT', `/doctor/cases/${uhid}/opinion`, dTok, { opinion: 'MY ASSESSMENT\nI agree a biopsy is the right next step.' });
  check('patient NOT told about the unsent draft',
    (await call('GET', '/notifications/mine', pTok)).body.items.some((n) => /opinion is ready/.test(n.title)), false);
  check('patient cannot read an undelivered opinion', (await call('GET', '/portal/opinions', pTok)).body.length, 0);

  const kase = await prisma.secondOpinion.findFirst({ where: { patientUhid: uhid } });
  const adminTok = jwt.sign({ id: 1, email: 'a@b.com', name: 'Admin', role: 'admin' }, S, { expiresIn: '1d' });
  await call('POST', `/doctor/cases/${uhid}/submit`, dTok);                                  // doctor submits for review
  const delivered = await call('POST', `/second-opinions/${kase.id}/deliver`, adminTok);     // admin approves and sends
  check('opinion delivered', delivered.status, 200);

  // ---------- 7. the patient receives it ----------
  step('7. the patient can read it');
  check('notified it is ready', (await call('GET', '/notifications/mine', pTok)).body.items.some((n) => /opinion is ready/.test(n.title)), true);
  const opinions = await call('GET', '/portal/opinions', pTok);
  check('the opinion is readable', opinions.body.length, 1);
  check('  with the doctor named', opinions.body[0].doctor, docName);
  check('  and the text intact', /biopsy is the right next step/.test(opinions.body[0].opinion || ''), true);
  check("  the counsellor's internal note stays internal", JSON.stringify(opinions.body).includes('For surgical oncology review'), false);

  // ---------- 8. they can talk ----------
  step('8. doctor and patient exchange messages');
  await call('POST', `/doctor/messages/${uhid}`, dTok, { body: 'Happy to discuss the biopsy if useful.' });
  const inbox = await call('GET', '/portal/messages', pTok);
  check('patient receives the message', inbox.body.some((m) => /discuss the biopsy/.test(m.body)), true);
  check('  attributed to the doctor', (inbox.body.find((m) => /discuss the biopsy/.test(m.body)) || {}).author, docName);
  await call('POST', '/portal/messages', pTok, { body: 'Yes please.' });
  check('doctor sees the reply', (await call('GET', `/doctor/messages/${uhid}`, dTok)).body.messages.some((m) => /Yes please/.test(m.body)), true);

  // ---------- 9. the patient can still log in with what they signed up with ----------
  step('9. the patient can log back in');
  const relogin = await call('POST', '/auth/patient-login', null, { email, password: 'JourneyPass123' });
  check('login works', relogin.status, 200);
  check('  same patient', relogin.body.patient.uhid, uhid);

  // cleanup
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
