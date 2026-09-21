(async () => {
const B = 'http://localhost:5500/api';
const j = async (p, opt = {}) => { const r = await fetch(B + p, opt); return { status: r.status, body: await r.json().catch(() => ({})) }; };
const post = (p, body, token) => j(p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) });
const get = (p, token) => j(p, { headers: token ? { Authorization: 'Bearer ' + token } : {} });

let pass = 0, fail = 0;
const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `  (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`}`); };

// A patient session, obtained the normal way.
const email = `roles${Date.now()}@example.com`;
const su = await post('/auth/patient-signup', { name: 'Roles Probe', email, password: 'ProbePass123' });
const patientToken = su.body.token;
check('patient signed up', su.status, 201);

// It must work on the patient portal...
check('patient token works on /portal/me', (await get('/portal/me', patientToken)).status, 200);

// ...and be refused everywhere an admin lives.
for (const p of ['/patients', '/staff', '/reports', '/settings', '/activity', '/invoices']) {
  check(`patient token REFUSED on ${p}`, (await get(p, patientToken)).status, 403);
}

// No token at all is still a 401, not a 403.
check('no token on /patients', (await get('/patients')).status, 401);

// An admin token still works.
const al = await post('/auth/login', { email: process.env.ADMIN_EMAIL || 'admin@dblhealthcare.com', password: process.env.ADMIN_PASSWORD || 'admin123' });
if (al.status === 200) {
  check('admin token works on /patients', (await get('/patients', al.body.token)).status, 200);
  check('admin token works on /staff', (await get('/staff', al.body.token)).status, 200);
} else {
  console.log('SKIP  admin checks — could not log in locally (' + al.status + ')');
}

const { PrismaClient } = require(process.cwd() + '/node_modules/@prisma/client');
const prisma = new PrismaClient();
await prisma.patient.deleteMany({ where: { email } });
await prisma.$disconnect();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
