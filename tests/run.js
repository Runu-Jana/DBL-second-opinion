// Runs every API suite in tests/api against a live local server and totals the result.
//
// The suites are not unit tests. Each one drives the real HTTP API against the real database,
// creates the rows it needs, checks what every role can and cannot see, and deletes what it made.
// They ran from a temp folder for a fortnight before moving here; the contract is unchanged:
//
//   - a server listening on http://localhost:5500 with JWT_SECRET=t (the suites mint their own
//     tokens with that secret so they can act as any role without a login round-trip) and
//     RATE_LIMIT=off (a full run trips the upload and login throttles otherwise)
//   - the local Postgres from docker-compose.yml, already pushed and seeded
//   - run from the repo root, since each suite requires node_modules relative to process.cwd()
//
// Usage:   npm test                  every suite
//          npm test -- questions     only suites whose file name contains "questions"
//
// Suites run one after another, not in parallel. Several count queue badges and unread totals
// across the whole table, and would race each other otherwise.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(__dirname, 'api');
const BASE = process.env.TEST_BASE || 'http://localhost:5500';
const SUITE_TIMEOUT_MS = 120_000;

const filters = process.argv.slice(2).filter((a) => !a.startsWith('-'));

function runSuite(file) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    let stdout = '';
    let stderr = '';
    const child = spawn(process.execPath, [file], { cwd: ROOT, env: process.env });
    const timer = setTimeout(() => child.kill(), SUITE_TIMEOUT_MS);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr, ms: Date.now() - t0 });
    });
  });
}

(async () => {
  let up = false;
  try { up = (await fetch(BASE + '/api/health')).ok; } catch { /* not listening */ }
  if (!up) {
    console.error(`No server answering at ${BASE}.\nStart one first, from the repo root:\n\n  PORT=5500 JWT_SECRET=t RATE_LIMIT=off node server/server.js\n`);
    process.exit(2);
  }

  let files = fs.readdirSync(DIR).filter((f) => f.endsWith('.test.js')).sort();
  if (filters.length) files = files.filter((f) => filters.some((x) => f.includes(x)));
  if (!files.length) { console.error('No suites match', filters.join(' ')); process.exit(2); }

  let passed = 0, failed = 0, broken = 0;
  const width = Math.max(...files.map((f) => f.length));
  for (const f of files) {
    const r = await runSuite(path.join(DIR, f));
    // Most suites end with "N passed, M failed". A few only print one PASS/FAIL line per
    // check, so fall back to counting those when the process ended cleanly.
    let m = r.stdout.match(/(\d+) passed, (\d+) failed\s*$/);
    if (!m && r.code === 0) {
      const ls = r.stdout.split('\n');
      const p = ls.filter((l) => /^PASS\b/.test(l)).length, q = ls.filter((l) => /^FAIL\b/.test(l)).length;
      if (p + q) m = [null, String(p), String(q)];
    }
    if (!m) {
      broken++;
      const why = r.signal ? `killed (${r.signal}) after ${SUITE_TIMEOUT_MS / 1000}s` : `exited ${r.code} without a result`;
      console.log(`BROKEN  ${f.padEnd(width)}  ${why}`);
      const tail = (r.stderr || r.stdout).trim().split('\n').slice(-12).join('\n');
      if (tail) console.log(tail.replace(/^/gm, '        '));
      continue;
    }
    const p = Number(m[1]), q = Number(m[2]);
    passed += p; failed += q;
    console.log(`${q ? 'FAIL  ' : 'ok    '}  ${f.padEnd(width)}  ${String(p).padStart(3)} passed${q ? `, ${q} failed` : ''}  ${(r.ms / 1000).toFixed(1)}s`);
    if (q) {
      const lines = r.stdout.split('\n').filter((l) => l.startsWith('FAIL'));
      console.log(lines.join('\n').replace(/^/gm, '        '));
    }
  }

  const suites = files.length - broken;
  console.log(`\n${passed + failed} checks across ${suites} suite${suites === 1 ? '' : 's'}: ${passed} passed, ${failed} failed` +
    (broken ? `, ${broken} suite${broken === 1 ? '' : 's'} did not finish` : ''));
  process.exit(failed || broken ? 1 : 0);
})();
