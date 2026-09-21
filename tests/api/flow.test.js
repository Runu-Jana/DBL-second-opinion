(async () => {
const B = 'http://localhost:5500/api/contact';
const post = async (p, body) => {
  const r = await fetch(B + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
let pass = 0, fail = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`}`);
};

const phone = '98' + String(Date.now()).slice(-8);
const email = `lead${Date.now()}@example.com`;

// 1. the form asks the server which field it must collect
const ch = await (await fetch(B + '/otp/channel')).json();
check('channel endpoint', ch, { channel: 'email', target: 'email' });

// 2. on the email channel an address is required
const noMail = await post('/otp/send', { name: 'Test Lead', phone });
check('missing email rejected', [noMail.status, noMail.body.error], [400, 'Please enter a valid email address.']);
const badMail = await post('/otp/send', { name: 'Test Lead', phone, email: 'not-an-address' });
check('malformed email rejected', badMail.status, 400);

// 3. send
const sent = await post('/otp/send', { name: 'Test Lead', phone, email });
check('send accepted', sent.status, 200);
check('reports the channel used', sent.body.channel, 'email');
const code = sent.body.devCode;
check('dev code returned (nothing really sent)', typeof code === 'string' && code.length === 6, true);

// 4. resend cooldown still guards the same number
const again = await post('/otp/send', { name: 'Test Lead', phone, email });
check('resend cooldown holds', again.status, 429);

// 5. a wrong code is refused
const wrong = await post('/otp/verify', { name: 'Test Lead', phone, code: code === '000000' ? '111111' : '000000' });
check('wrong code refused', [wrong.status, wrong.body.error], [401, 'Incorrect code. Please try again.']);

// 6. the right code registers the lead
const ok = await post('/otp/verify', { name: 'Test Lead', phone, code });
check('correct code accepted', ok.status, 200);
check('uhid issued', /^DBL\d{6}$/.test(ok.body.uhid || ''), true);

// 7. the code is single-use
const reuse = await post('/otp/verify', { name: 'Test Lead', phone, code });
check('code cannot be replayed', reuse.status, 400);

// 8. what actually landed in the database
const { PrismaClient } = require(process.cwd() + '/node_modules/@prisma/client');
const prisma = new PrismaClient();
const p = await prisma.patient.findFirst({ where: { phone: '91' + phone } });
check('patient created', !!p, true);
check('email stored', p?.email, email);
check('email marked verified', p?.emailVerified, true);
check('phone NOT marked verified (the code went to email)', p?.phoneVerified, false);
check('phone kept for callbacks', p?.phone, '91' + phone);
check('only one row for this lead', await prisma.patient.count({ where: { phone: '91' + phone } }), 1);

await prisma.patient.deleteMany({ where: { phone: '91' + phone } });
await prisma.$disconnect();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
