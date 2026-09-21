// Are registering patients actually saved, and saved correctly? Checks the row itself, not the
// API's word for it — every route a patient can enter by, and what ends up in the database.
(async () => {
  const ROOT = process.cwd();
  const bcrypt = require(ROOT + '/node_modules/bcryptjs');
  const { PrismaClient } = require(ROOT + '/node_modules/@prisma/client');
  const prisma = new PrismaClient();
  const B = 'http://localhost:5500/api';

  let pass = 0, fail = 0;
  const check = (n, got, want) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    ok ? pass++ : fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `  (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`}`);
  };
  const post = async (p, body, token) => {
    const r = await fetch(B + p, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify(body),
    });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };

  const stamp = Date.now();
  const emails = [];

  // ================= route 1: public sign-up =================
  console.log('\n--- route 1: Sign up on the website ---');
  const e1 = `persist${stamp}@example.com`;
  emails.push(e1);
  const su = await post('/auth/patient-signup', { name: 'Persist One', email: e1, password: 'RealPass123' });
  check('signup returns 201', su.status, 201);

  const row = await prisma.patient.findFirst({ where: { email: e1 } });
  check('a row exists in the database', !!row, true);
  check('  name stored', row.name, 'Persist One');
  check('  email stored', row.email, e1);
  check('  UHID stored and well-formed', /^DBL\d{6}$/.test(row.uhid || ''), true);
  check('  status defaulted', row.status, 'New Patient');
  check('  createdAt stamped', row.createdAt instanceof Date, true);
  check('  exactly one row, not a duplicate', await prisma.patient.count({ where: { email: e1 } }), 1);

  // the part that matters most
  check('  password is NOT stored in plain text', row.password === 'RealPass123', false);
  check('  password is a bcrypt hash', /^\$2[aby]\$\d{2}\$/.test(row.password || ''), true);
  check('  and the hash verifies against the real password', await bcrypt.compare('RealPass123', row.password), true);
  check('  the API response never included the hash', Object.keys(su.body.patient).includes('password'), false);

  // ================= duplicates and case =================
  console.log('\n--- the same person signing up twice ---');
  const dup = await post('/auth/patient-signup', { name: 'Persist One Again', email: e1, password: 'Another123' });
  check('a second signup on the same email is refused', dup.status, 409);
  check('  still only one row', await prisma.patient.count({ where: { email: e1 } }), 1);

  const upper = await post('/auth/patient-signup', { name: 'Shouty', email: e1.toUpperCase(), password: 'Another123' });
  check('the same email in capitals is also refused', upper.status, 409);
  check('  and creates nothing', await prisma.patient.count({ where: { email: { equals: e1, mode: 'insensitive' } } }), 1);

  // ================= route 2: the OTP lead pop-up =================
  console.log('\n--- route 2: verified through the lead pop-up ---');
  const phone = '96' + String(stamp).slice(-8);
  const e2 = `otp${stamp}@example.com`;
  emails.push(e2);
  const sent = await post('/contact/otp/send', { name: 'Persist Two', phone, email: e2 });
  const verified = await post('/contact/otp/verify', { name: 'Persist Two', phone, code: sent.body.devCode });
  check('OTP registration returns a UHID', /^DBL\d{6}$/.test(verified.body.uhid || ''), true);

  const row2 = await prisma.patient.findFirst({ where: { uhid: verified.body.uhid } });
  check('  the row is in the database', !!row2, true);
  check('  phone stored with country code', row2.phone, '91' + phone);
  check('  email stored', row2.email, e2);
  check('  email marked verified', row2.emailVerified, true);
  check('  phone NOT marked verified (the code went to email)', row2.phoneVerified, false);
  check('  no password yet, as expected for this route', row2.password, null);

  // ================= route 3: auto-registered by an upload =================
  console.log('\n--- route 3: created by uploading reports ---');
  const e3 = `upload${stamp}@example.com`;
  emails.push(e3);
  const fd = new FormData();
  fd.append('patientName', 'Persist Three');
  fd.append('email', e3);
  fd.append('reports', new Blob([Buffer.alloc(256, 1)], { type: 'application/pdf' }), 'scan.pdf');
  const upRes = await fetch(B + '/upload/report', { method: 'POST', body: fd });
  const upBody = await upRes.json();
  const row3 = await prisma.patient.findFirst({ where: { uhid: upBody.patientUhid } });
  check('a patient row was created', !!row3, true);
  check('  with their email', row3.email, e3);
  check('  and their document linked by UHID', await prisma.report.count({ where: { patientUhid: row3.uhid } }), 1);

  // ================= it is really persisted, not just in memory =================
  console.log('\n--- persistence, read back on a fresh connection ---');
  const fresh = new PrismaClient();
  const again = await fresh.patient.findFirst({ where: { email: e1 } });
  check('the row survives a new database connection', again && again.uhid, row.uhid);
  check('  and still logs in', (await post('/auth/patient-login', { email: e1, password: 'RealPass123' })).status, 200);
  await fresh.$disconnect();

  // ================= UHIDs do not collide =================
  const all = await prisma.patient.findMany({ select: { uhid: true } });
  const uhids = all.map((p) => p.uhid).filter(Boolean);
  check(`all ${uhids.length} UHIDs in the database are unique`, uhids.length, new Set(uhids).size);

  await prisma.report.deleteMany({ where: { patientUhid: { in: [row3.uhid] } } });
  await prisma.patient.deleteMany({ where: { email: { in: emails } } });
  await prisma.$disconnect();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
