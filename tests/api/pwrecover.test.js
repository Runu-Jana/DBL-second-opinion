// A patient who registered through the OTP pop-up has a record and no password. Can they get in?
(async () => {
  const ROOT = process.cwd();
  const { PrismaClient } = require(ROOT + '/node_modules/@prisma/client');
  const prisma = new PrismaClient();
  const B = 'http://localhost:5500/api';

  let pass = 0, fail = 0;
  const check = (n, got, want) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    ok ? pass++ : fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `  (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`}`);
  };
  const post = async (p, body) => {
    const r = await fetch(B + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };

  const stamp = Date.now();
  const email = `otponly${stamp}@example.com`;
  const uhid = 'DBLP' + String(stamp).slice(-5);

  // Exactly what the lead pop-up creates: verified, no password.
  await prisma.patient.create({ data: { name: `OTP Only ${stamp}`, uhid, email, emailVerified: true, status: 'New Patient' } });

  // --- the symptom the user hit ---
  const login = await post('/auth/patient-login', { email, password: 'AnythingAtAll1' });
  check('login refuses a passwordless account', login.status, 401);
  check('  with the message they saw', login.body.error, 'Email or password is incorrect.');

  // --- the recovery path that used to be a dead end ---
  const forgot = await post('/auth/patient-forgot', { email });
  check('forgot-password accepts the request', forgot.status, 200);
  check('  and actually issues a link for a passwordless account', typeof forgot.body.devResetUrl, 'string');

  const token = decodeURIComponent((/token=([^&]+)/.exec(forgot.body.devResetUrl) || [])[1] || '');
  const reset = await post('/auth/patient-reset', { token, password: 'BrandNewPass123' });
  check('the link sets a password', reset.status, 200);
  check('  and signs them straight in', typeof reset.body.token, 'string');
  check('  as the same patient', reset.body.patient.uhid, uhid);

  // --- and now the normal login works ---
  const after = await post('/auth/patient-login', { email, password: 'BrandNewPass123' });
  check('login now succeeds', after.status, 200);
  check('  same account, not a duplicate', after.body.patient.uhid, uhid);
  check('only one patient row exists for this email', await prisma.patient.count({ where: { email } }), 1);

  // --- an unknown email must still reveal nothing ---
  const unknown = await post('/auth/patient-forgot', { email: `nobody${stamp}@example.com` });
  check('an unknown email gets the same generic answer', unknown.status, 200);
  check('  and no link', unknown.body.devResetUrl, undefined);

  await prisma.patient.deleteMany({ where: { email } });
  await prisma.$disconnect();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
