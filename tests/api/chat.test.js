// Doctor <-> patient messaging: it must reach the right person, and nobody else.
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
  const docName = `Dr Chat ${stamp}`;
  const uhid = 'DBLC' + String(stamp).slice(-5);
  const dTok = jwt.sign({ id: 401, name: docName, role: 'doctor', jobRole: 'Oncologist' }, S, { expiresIn: '1d' });
  const otherDoc = jwt.sign({ id: 402, name: 'Dr Not Theirs', role: 'doctor' }, S, { expiresIn: '1d' });

  await prisma.staff.create({ data: { name: docName, role: 'Oncologist', status: 'Active', password: 'x', email: `c${stamp}@example.com` } });
  const patient = await prisma.patient.create({ data: { name: `Chat Probe ${stamp}`, uhid, doctor: docName, password: 'x', email: `cp${stamp}@example.com` } });
  const pTok = jwt.sign({ id: patient.id, uhid, name: patient.name, role: 'patient' }, S, { expiresIn: '1d' });

  const stranger = await prisma.patient.create({ data: { name: `Stranger ${stamp}`, uhid: 'DBLX' + String(stamp).slice(-5), password: 'x' } });
  const sTok = jwt.sign({ id: stranger.id, uhid: stranger.uhid, name: stranger.name, role: 'patient' }, S, { expiresIn: '1d' });

  // --- only the assigned doctor may open the thread ---
  check('assigned doctor can open the thread', (await call('GET', `/doctor/messages/${uhid}`, dTok)).status, 200);
  check('another doctor cannot', (await call('GET', `/doctor/messages/${uhid}`, otherDoc)).status, 404);
  check('another doctor cannot send into it', (await call('POST', `/doctor/messages/${uhid}`, otherDoc, { body: 'hi' })).status, 404);
  check('a patient token cannot use the doctor route', (await call('GET', `/doctor/messages/${uhid}`, pTok)).status, 403);

  // --- doctor -> patient ---
  const sent = await call('POST', `/doctor/messages/${uhid}`, dTok, { body: 'Your scan looks stable. Shall we review in six weeks?' });
  check('doctor sends a message', sent.status, 201);
  check('  attributed to the doctor', sent.body.author, docName);
  check('  sent from the care side', sent.body.sender, 'care');
  check('  unread for the patient', sent.body.readByPatient, false);

  const inbox = await call('GET', '/portal/messages', pTok);
  check('the patient receives it', inbox.body.some((m) => /six weeks/.test(m.body)), true);
  check('  and can see who wrote it', inbox.body.find((m) => /six weeks/.test(m.body)).author, docName);

  // --- patient -> doctor ---
  const reply = await call('POST', '/portal/messages', pTok, { body: 'Thank you doctor, six weeks works.' });
  check('patient replies', reply.status, 201);
  const thread = await call('GET', `/doctor/messages/${uhid}`, dTok);
  check('the doctor sees the reply', thread.body.messages.some((m) => /six weeks works/.test(m.body)), true);
  check('  the thread holds both sides', thread.body.messages.length, 2);

  // opening the thread marks the patient's message read on the care side
  const after = await prisma.message.findFirst({ where: { patientUhid: uhid, sender: 'patient' } });
  check('opening the thread marks it read for care', after.readByCare, true);

  // --- another patient must not see any of it ---
  const strangerInbox = await call('GET', '/portal/messages', sTok);
  check('an unrelated patient sees none of this', strangerInbox.body.length, 0);

  // --- empty messages refused ---
  check('an empty message is refused', (await call('POST', `/doctor/messages/${uhid}`, dTok, { body: '   ' })).status, 400);

  await prisma.message.deleteMany({ where: { patientUhid: uhid } });
  await prisma.patient.deleteMany({ where: { uhid: { in: [uhid, stranger.uhid] } } });
  await prisma.staff.deleteMany({ where: { name: docName } });
  await prisma.$disconnect();

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
