// How does a public upload decide WHICH patient it belongs to? It matches on email or name.
// Name matching is the part worth probing: two patients can share a name.
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
  const upload = async (patientName, email, label) => {
    const fd = new FormData();
    fd.append('patientName', patientName);
    if (email) fd.append('email', email);
    fd.append('reports', new Blob([Buffer.alloc(512, 1)], { type: 'application/pdf' }), `${label}.pdf`);
    const r = await fetch(B + '/upload/report', { method: 'POST', body: fd });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };

  const stamp = Date.now();

  // --- 1. an existing patient uploading with their email ---
  const email = `link${stamp}@example.com`;
  const p1 = await prisma.patient.create({ data: { name: `Link Probe ${stamp}`, uhid: 'DBLL' + String(stamp).slice(-5), email } });
  const r1 = await upload(p1.name, email, 'byemail');
  check('upload with a matching email links to that patient', r1.body.patientUhid, p1.uhid);

  // --- 2. the same name, no email ---
  const r2 = await upload(p1.name, null, 'byname');
  check('upload with only a name still links', r2.body.patientUhid, p1.uhid);

  // --- 3. TWO patients sharing a name — which one gets the documents? ---
  const shared = `Shared Name ${stamp}`;
  const a = await prisma.patient.create({ data: { name: shared, uhid: 'DBLA' + String(stamp).slice(-5), email: `a${stamp}@example.com` } });
  const b = await prisma.patient.create({ data: { name: shared, uhid: 'DBLB' + String(stamp).slice(-5), email: `b${stamp}@example.com` } });

  // B uploads, giving THEIR email. It must reach B, not A.
  const r3 = await upload(shared, `b${stamp}@example.com`, 'sharedB');
  check('with an email given, the right namesake gets it', r3.body.patientUhid, b.uhid);

  // Now with no email at all: the ambiguous case.
  const r4 = await upload(shared, null, 'sharedNone');
  const landedOn = r4.body.patientUhid;
  console.log(`      (name-only upload for two namesakes landed on ${landedOn}; A=${a.uhid} B=${b.uhid})`);
  check('a name-only upload for two namesakes is NOT guessed at', landedOn, null);
  const orphan = await prisma.report.findFirst({ where: { patientName: shared, patientUhid: null } });
  check('  and is flagged for a human to match', /NEEDS MATCHING/.test((orphan||{}).notes||''), true);

  // --- 4. an unknown person: a patient record is created ---
  const newName = `Brand New ${stamp}`;
  const r5 = await upload(newName, `new${stamp}@example.com`, 'brandnew');
  check('an unknown uploader gets a new patient record', /^DBL\d{6}$/.test(r5.body.patientUhid || ''), true);

  const created = await prisma.patient.findFirst({ where: { uhid: r5.body.patientUhid } });
  check('  with their email stored', created.email, `new${stamp}@example.com`);
  check('  and no password (so they must sign up to log in)', created.password, null);

  await prisma.report.deleteMany({ where: { patientName: { in: [p1.name, shared, newName] } } });
  await prisma.patient.deleteMany({ where: { name: { in: [p1.name, shared, newName] } } });
  await prisma.$disconnect();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
