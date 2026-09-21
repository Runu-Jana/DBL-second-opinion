// A patient who registered through the OTP pop-up has an account and no password. Setting one
// from inside their session must work without a "current" password they never had, and must
// need the current one once it exists, so a stolen session cannot lock the real owner out.
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
  const email = `setpw${stamp}@example.com`;
  const uhid = 'DBLW' + String(stamp).slice(-5);

  // Exactly what the lead pop-up creates: verified, no password.
  const patient = await prisma.patient.create({ data: { name: `Set Password ${stamp}`, uhid, email, emailVerified: true, status: 'New Patient' } });
  const pTok = jwt.sign({ id: patient.id, uhid, name: patient.name, email, role: 'patient' }, S, { expiresIn: '1d' });
  const dTok = jwt.sign({ id: 1, name: 'Dr Nobody', role: 'doctor', jobRole: 'Oncologist' }, S, { expiresIn: '1d' });

  // ---- who may call it ----
  check('anonymous is refused', (await call('PUT', '/portal/password', null, { password: 'FirstPass1' })).status, 401);
  check('a doctor token is refused', (await call('PUT', '/portal/password', dTok, { password: 'FirstPass1' })).status, 403);
  check('too short is refused', (await call('PUT', '/portal/password', pTok, { password: 'abc' })).status, 400);
  check('login is still refused before a password exists', (await call('POST', '/auth/patient-login', null, { email, password: 'FirstPass1' })).status, 401);

  // ---- first password: no current one to give ----
  const set = await call('PUT', '/portal/password', pTok, { password: 'FirstPass1' });
  check('a first password needs no current one', set.status, 200);
  check('  and the hash is not echoed back', !!set.body.patient && ('password' in set.body.patient), false);
  const row = await prisma.patient.findUnique({ where: { id: patient.id } });
  check('  the row holds a hash, not the text', !!row.password && row.password !== 'FirstPass1', true);

  const login = await call('POST', '/auth/patient-login', null, { email, password: 'FirstPass1' });
  check('login then works with it', login.status, 200);
  check('  as the same patient, no duplicate row', login.body.patient?.uhid, uhid);
  check('  and there is still exactly one record for that email', await prisma.patient.count({ where: { email } }), 1);

  // ---- changing it later needs the current one ----
  check('changing it without the current one is refused', (await call('PUT', '/portal/password', pTok, { password: 'SecondPass2' })).status, 400);
  check('  or with a wrong current one', (await call('PUT', '/portal/password', pTok, { password: 'SecondPass2', current: 'nope' })).status, 400);
  check('and works with the right one', (await call('PUT', '/portal/password', pTok, { password: 'SecondPass2', current: 'FirstPass1' })).status, 200);
  check('  after which the old one no longer signs in', (await call('POST', '/auth/patient-login', null, { email, password: 'FirstPass1' })).status, 401);
  check('  and the new one does', (await call('POST', '/auth/patient-login', null, { email, password: 'SecondPass2' })).status, 200);

  await prisma.notification.deleteMany({ where: { recipient: uhid } });
  await prisma.patient.delete({ where: { id: patient.id } });
  await prisma.$disconnect();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
