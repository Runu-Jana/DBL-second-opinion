(async () => {
const B = 'http://localhost:5500/api';
const post = async (p, body, token) => {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = 'Bearer ' + token;
  const r = await fetch(B + p, { method: 'POST', headers: h, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const get = async (p, token) => {
  const r = await fetch(B + p, { headers: token ? { Authorization: 'Bearer ' + token } : {} });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
let pass = 0, fail = 0;
const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `  (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`}`); };

const phone = '97' + String(Date.now()).slice(-8);
const email = `lead${Date.now()}@example.com`;

const sent = await post('/contact/otp/send', { name: 'Flow Probe', phone, email });
check('code sent', sent.status, 200);
const code = sent.body.devCode;

const v = await post('/contact/otp/verify', { name: 'Flow Probe', phone, code });
check('verified', v.status, 200);
check('a session token came back', typeof v.body.token === 'string' && v.body.token.length > 20, true);
check('the patient record came back', v.body.patient && v.body.patient.uhid === v.body.uhid, true);
check('no password hash leaked', v.body.patient && !('password' in v.body.patient), true);

// The whole point: that session must work against the patient portal.
const me = await get('/portal/me', v.body.token);
check('session works on /portal/me', me.status, 200);
check('it is the right patient', me.body.patient && me.body.patient.uhid, v.body.uhid);

// And it must be a patient session, not something over-privileged.
const admin = await get('/patients', v.body.token);
check("the session canNOT read the admin patient list", admin.status, 403);

const { PrismaClient } = require(process.cwd() + '/node_modules/@prisma/client');
const prisma = new PrismaClient();
const p = await prisma.patient.findFirst({ where: { phone: '91' + phone } });
check('patient is in the database for admin to see', !!p, true);
check('marked as a new patient', p && p.status, 'New Patient');
check('email verified, phone not', p && [p.emailVerified, p.phoneVerified], [true, false]);
await prisma.patient.deleteMany({ where: { phone: '91' + phone } });
await prisma.$disconnect();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
