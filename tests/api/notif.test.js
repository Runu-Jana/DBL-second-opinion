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
  const get = async (p, token) => {
    const r = await fetch(B + p, { headers: token ? { Authorization: 'Bearer ' + token } : {} });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };

  const adminTok = jwt.sign({ id: 1, email: 'a@b.com', name: 'A', role: 'admin' }, S, { expiresIn: '1d' });
  const patientTok = jwt.sign({ id: 2, uhid: 'X', name: 'P', role: 'patient' }, S, { expiresIn: '1d' });

  // --- access ---
  check('anonymous refused', (await get('/notifications')).status, 401);
  check('patient refused', (await get('/notifications', patientTok)).status, 403);
  check('admin admitted', (await get('/notifications', adminTok)).status, 200);

  // --- a fresh "last seen" means nothing is new ---
  const now = new Date().toISOString();
  const after = await get(`/notifications?activitySince=${now}&messagesSince=${now}`, adminTok);
  check('nothing new since just now', [after.body.activity, after.body.messages], [0, 0]);

  // --- create one of each and watch the counts move ---
  const stamp = Date.now();
  await prisma.activityLog.create({ data: { kind: 'activity', action: `probe ${stamp}`, category: 'Patient' } });
  await prisma.contactMessage.create({ data: { name: 'Probe', email: `n${stamp}@example.com`, message: 'hi', status: 'New' } });
  await prisma.message.create({ data: { patientName: 'Probe', sender: 'patient', body: 'hello', readByCare: false } });

  const moved = await get(`/notifications?activitySince=${now}&messagesSince=${now}`, adminTok);
  check('activity count picked up the new entry', moved.body.activity, 1);
  check('messages count picked up both new items', moved.body.messages, 2);

  // --- "opening the panel" (moving the timestamp forward) clears them ---
  const later = new Date(Date.now() + 1000).toISOString();
  const cleared = await get(`/notifications?activitySince=${later}&messagesSince=${later}`, adminTok);
  check('marking as seen clears activity', cleared.body.activity, 0);
  check('marking as seen clears messages', cleared.body.messages, 0);

  // --- but genuinely outstanding work is still reported separately ---
  check('outstanding contact messages still counted', cleared.body.outstanding.contact >= 1, true);
  check('outstanding patient messages still counted', cleared.body.outstanding.messages >= 1, true);

  // --- no "since" at all means count everything ---
  const all = await get('/notifications', adminTok);
  check('missing timestamp counts everything', all.body.activity >= 1, true);
  // --- garbage timestamp must not blow up ---
  const junk = await get('/notifications?activitySince=not-a-date', adminTok);
  check('unparseable timestamp is tolerated', junk.status, 200);

  await prisma.activityLog.deleteMany({ where: { action: `probe ${stamp}` } });
  await prisma.contactMessage.deleteMany({ where: { email: `n${stamp}@example.com` } });
  await prisma.message.deleteMany({ where: { patientName: 'Probe' } });
  await prisma.$disconnect();

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
