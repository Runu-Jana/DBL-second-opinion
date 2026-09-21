// The admin staff directory must show who can log in, who has activated, and who has signed in —
// without ever handing the password hash to the browser.
(async () => {
  const ROOT = process.cwd();
  const jwt = require(ROOT + '/node_modules/jsonwebtoken');
  const crypto = require('crypto');
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
  const adminTok = jwt.sign({ id: 1, email: 'a@b.com', name: 'Admin', role: 'admin' }, S, { expiresIn: '1d' });
  const rowFor = async (id) => (await call('GET', '/staff', adminTok)).body.find((s) => s.id === id);

  const stamp = Date.now();
  const cnsEmail = `cns-login-${stamp}@x.com`;
  const nutEmail = `nut-login-${stamp}@x.com`;

  // A counsellor added by admin: has a portal, no password yet, never signed in.
  const cns = (await call('POST', '/staff', adminTok, { name: `Login Cns ${stamp}`, role: 'Counsellor', email: cnsEmail })).body;
  const nut = (await call('POST', '/staff', adminTok, { name: `Login Nut ${stamp}`, role: 'Nutritionist', email: nutEmail })).body;

  let row = await rowFor(cns.id);
  check('the password hash is never sent to the client', 'password' in row, false);
  check('a portal role reports it can log in', row.canLogin, true);
  check('  and starts with no password', row.hasPassword, false);
  check('  and no last login', row.lastLoginAt, null);

  const nutRow = await rowFor(nut.id);
  check('a non-portal role reports it cannot log in', nutRow.canLogin, false);

  // Activate: exactly what the emailed link does — the token carries the current-password fingerprint.
  const fp = crypto.createHash('sha256').update(`${cns.id}:unset`).digest('hex').slice(0, 16);
  const actTok = jwt.sign({ id: cns.id, email: cnsEmail, purpose: 'dr-activate', pw: fp }, S, { expiresIn: '7d' });
  const activate = await call('POST', '/auth/doctor-set-password', null, { token: actTok, password: 'FirstPass12' });
  check('activation sets the password and signs them in', activate.status, 200);

  row = await rowFor(cns.id);
  check('activated now shows a password', row.hasPassword, true);
  check('  and a last-login stamp (activation is a sign-in)', !!row.lastLoginAt, true);

  // A later login moves the stamp forward.
  const before = row.lastLoginAt;
  await new Promise((r) => setTimeout(r, 1100));
  const login = await call('POST', '/auth/doctor-login', null, { email: cnsEmail, password: 'FirstPass12' });
  check('login as the counsellor succeeds', login.status, 200);
  row = await rowFor(cns.id);
  check('  and updates the last-login stamp', row.lastLoginAt !== before, true);

  await prisma.staff.deleteMany({ where: { id: { in: [cns.id, nut.id] } } });
  await prisma.$disconnect();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
