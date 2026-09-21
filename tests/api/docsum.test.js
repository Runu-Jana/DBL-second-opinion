// Per-document summarising and notes on the doctor's own case.
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
  const docName = `Dr Note ${stamp}`;
  const uhid = 'DBLN' + String(stamp).slice(-5);
  const dTok = jwt.sign({ id: 501, name: docName, role: 'doctor', jobRole: 'Oncologist' }, S, { expiresIn: '1d' });
  const otherTok = jwt.sign({ id: 502, name: 'Dr Someone Else', role: 'doctor' }, S, { expiresIn: '1d' });
  const cTok = jwt.sign({ id: 503, name: 'Priya Nair', role: 'counsellor' }, S, { expiresIn: '1d' });

  await prisma.staff.create({ data: { name: docName, role: 'Oncologist', status: 'Active', password: 'x', email: `n${stamp}@example.com` } });
  const patient = await prisma.patient.create({ data: { name: `Note Probe ${stamp}`, uhid } });
  const mine = await prisma.report.create({ data: { patientName: patient.name, patientUhid: uhid, type: 'CT Scan', fileUrl: '/uploads/a.pdf', doctor: docName, status: 'Pending Review' } });
  const theirs = await prisma.report.create({ data: { patientName: 'Someone Else', type: 'CT Scan', fileUrl: '/uploads/b.pdf', doctor: 'Dr Someone Else', status: 'Pending Review' } });

  // --- ownership on both new routes ---
  check('another doctor cannot summarise my document', (await call('POST', `/doctor/documents/${mine.id}/analyse`, otherTok)).status, 404);
  check('another doctor cannot note on my document', (await call('PUT', `/doctor/documents/${mine.id}/note`, otherTok, { note: 'x' })).status, 404);
  check('I cannot note on their document', (await call('PUT', `/doctor/documents/${theirs.id}/note`, dTok, { note: 'x' })).status, 404);
  check('a counsellor cannot use the doctor note route', (await call('PUT', `/doctor/documents/${mine.id}/note`, cTok, { note: 'x' })).status, 403);

  // --- manual note works and round-trips ---
  const saved = await call('PUT', `/doctor/documents/${mine.id}/note`, dTok, { note: 'Spiculated margin; discuss at MDT.' });
  check('note saved', saved.status, 200);
  check('  text stored', saved.body.notes, 'Spiculated margin; discuss at MDT.');
  const row = await prisma.report.findUnique({ where: { id: mine.id } });
  check('  persisted to the database', row.notes, 'Spiculated margin; discuss at MDT.');

  // --- clearing a note ---
  const cleared = await call('PUT', `/doctor/documents/${mine.id}/note`, dTok, { note: '   ' });
  check('an empty note clears it rather than storing blanks', cleared.body.notes, null);

  // --- AI path reports honestly when the key is absent ---
  const ai = await call('POST', `/doctor/documents/${mine.id}/analyse`, dTok);
  check('AI analyse answers 503 when unconfigured (not a crash)', ai.status, 503);
  check('  and says why', /not configured/i.test(ai.body.error || ''), true);

  await prisma.report.deleteMany({ where: { OR: [{ patientUhid: uhid }, { id: theirs.id }] } });
  await prisma.patient.deleteMany({ where: { uhid } });
  await prisma.staff.deleteMany({ where: { name: docName } });
  await prisma.$disconnect();

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
