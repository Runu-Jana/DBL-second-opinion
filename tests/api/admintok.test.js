(async () => {
const jwt = require(process.cwd() + '/node_modules/jsonwebtoken');
const S = 't';
const B = 'http://localhost:5500/api';
const get = async (p, token) => (await fetch(B + p, { headers: { Authorization: 'Bearer ' + token } })).status;

let pass = 0, fail = 0;
const check = (n, got, want) => { const ok = got === want; ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `  (got ${got}, want ${want})`}`); };

const newAdmin  = jwt.sign({ id: 1, email: 'a@b.com', name: 'A', role: 'admin' }, S, { expiresIn: '15d' });
const oldAdmin  = jwt.sign({ id: 1, email: 'a@b.com', name: 'A' }, S, { expiresIn: '15d' });   // issued before the fix
const patient   = jwt.sign({ id: 2, uhid: 'DBL1', name: 'P', role: 'patient' }, S, { expiresIn: '15d' });
const doctor    = jwt.sign({ id: 3, name: 'D', role: 'doctor' }, S, { expiresIn: '15d' });
const resetLink = jwt.sign({ id: 2, email: 'a@b.com', purpose: 'pwreset' }, S, { expiresIn: '30m' });
const forged    = jwt.sign({ id: 1, email: 'a@b.com', role: 'admin' }, 'wrong-secret', { expiresIn: '15d' });

check('new admin token (role:admin) admitted', await get('/patients', newAdmin), 200);
check('legacy admin token (no role) still admitted', await get('/patients', oldAdmin), 200);
check('patient token refused', await get('/patients', patient), 403);
check('doctor token refused', await get('/patients', doctor), 403);
check('password-reset link token refused', await get('/patients', resetLink), 403);
check('token signed with the wrong secret refused', await get('/patients', forged), 401);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
