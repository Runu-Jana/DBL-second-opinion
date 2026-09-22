// Walks a case from assignment to delivery and checks who was told what, at each step.
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
  const feed = async (tok) => (await call('GET', '/notifications/mine', tok)).body;
  const titles = (f) => (f.items || []).map((n) => n.title);

  const stamp = Date.now();
  const docName = `Dr Notify ${stamp}`;
  const cnsName = `Cns Notify ${stamp}`;
  const uhid = 'DBLF' + String(stamp).slice(-5);

  const dTok = jwt.sign({ id: 301, name: docName, role: 'doctor', jobRole: 'Oncologist' }, S, { expiresIn: '1d' });
  const cTok = jwt.sign({ id: 302, name: cnsName, role: 'counsellor', jobRole: 'Counsellor' }, S, { expiresIn: '1d' });

  await prisma.staff.createMany({ data: [
    { name: docName, role: 'Oncologist', status: 'Active', password: 'x', specialties: 'Lung Cancer', email: `d${stamp}@example.com` },
    { name: cnsName, role: 'Counsellor', status: 'Active', password: 'x', email: `c${stamp}@example.com` },
  ] });
  const patient = await prisma.patient.create({ data: { name: `Notify Probe ${stamp}`, uhid, email: `p${stamp}@example.com`, password: 'x' } });
  const pTok = jwt.sign({ id: patient.id, uhid, name: patient.name, role: 'patient' }, S, { expiresIn: '1d' });
  await prisma.report.create({ data: { patientName: patient.name, patientUhid: uhid, type: 'CT Scan', fileUrl: '/uploads/a.pdf', status: 'Pending Review' } });

  check('patient starts with an empty feed', (await feed(pTok)).items.length, 0);

  // --- counsellor assigns ---
  await call('PUT', `/counsellor/folders/${patient.id}/report`, cTok, { report: 'Routing to thoracic.', cancerType: 'Lung Cancer' });
  await call('POST', `/counsellor/folders/${patient.id}/assign`, cTok, { doctor: docName, category: 'Lung Cancer' });

  let pf = await feed(pTok);
  check('patient told a specialist was assigned', titles(pf).includes('A specialist has been assigned to your case'), true);
  check('  and it names the doctor', (pf.items.find((n) => n.title.includes('specialist')) || {}).body.includes(docName), true);
  check('doctor told they have a new case', titles(await feed(dTok)).includes('New case assigned to you'), true);

  // --- doctor opens the case: review begins ---
  await call('GET', `/doctor/cases/${uhid}`, dTok);
  pf = await feed(pTok);
  check('patient told their reports were reviewed', titles(pf).includes('Your reports have been reviewed'), true);

  // Opening it again must not tell them twice — the reports are already reviewed, so nothing moves.
  await call('GET', `/doctor/cases/${uhid}`, dTok);
  pf = await feed(pTok);
  check('  and only once, however often the doctor revisits', titles(pf).filter((t) => t === 'Your reports have been reviewed').length, 1);

  // --- doctor saves a draft: the patient must NOT hear about it ---
  await call('PUT', `/doctor/cases/${uhid}/opinion`, dTok, { opinion: 'Draft, not sent.' });
  pf = await feed(pTok);
  check('an unsent draft tells the patient nothing', titles(pf).includes('Your second opinion is ready'), false);

  // --- doctor submits for review: the patient still hears nothing ---
  await call('POST', `/doctor/cases/${uhid}/submit`, dTok);
  check('submitting for review tells the patient nothing', titles(await feed(pTok)).includes('Your second opinion is ready'), false);

  // --- admin approves and delivers: only now is the patient (and counsellor) told ---
  const kase = await prisma.secondOpinion.findFirst({ where: { patientUhid: uhid } });
  const adminTok = jwt.sign({ id: 1, email: 'a@b.com', name: 'Admin', role: 'admin' }, S, { expiresIn: '1d' });
  await call('POST', `/second-opinions/${kase.id}/deliver`, adminTok);
  pf = await feed(pTok);
  check('patient told the opinion is ready', titles(pf).includes('Your second opinion is ready'), true);
  check('counsellor told it was delivered', titles(await feed(cTok)).includes('Opinion delivered'), true);

  // --- messages both ways ---
  await call('POST', `/doctor/messages/${uhid}`, dTok, { body: 'Please book a follow-up.' });
  check('patient told about the doctor message', titles(await feed(pTok)).some((t) => t.startsWith('New message from')), true);
  await call('POST', '/portal/messages', pTok, { body: 'Thank you.' });
  check('doctor told about the patient reply', titles(await feed(dTok)).some((t) => t.startsWith('New message from')), true);

  // --- read state ---
  pf = await feed(pTok);
  check('unread count matches the feed', pf.unread, pf.items.filter((n) => !n.readAt).length);
  const one = pf.items[0];
  await call('POST', '/notifications/mine/read', pTok, { id: one.id });
  const afterOne = await feed(pTok);
  check('marking one read drops the count by one', afterOne.unread, pf.unread - 1);
  await call('POST', '/notifications/mine/read', pTok, {});
  check('mark-all clears the rest', (await feed(pTok)).unread, 0);

  // --- isolation ---
  const stranger = jwt.sign({ id: 999, uhid: 'DBLZZZZ9', name: 'Stranger', role: 'patient' }, S, { expiresIn: '1d' });
  check('another patient sees none of it', (await feed(stranger)).items.length, 0);
  const otherDoc = jwt.sign({ id: 998, name: 'Dr Unrelated', role: 'doctor' }, S, { expiresIn: '1d' });
  check('an unrelated doctor sees none of it', (await feed(otherDoc)).items.length, 0);
  check('no token is refused', (await (await fetch(B + '/notifications/mine')).json()).error !== undefined, true);

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
