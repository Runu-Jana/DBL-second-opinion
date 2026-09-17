// Deep health check for the database.
//
// Without this, a deploy whose schema was never pushed looks identical to one whose database is
// unreachable: every endpoint returns an anonymous 500 and the only evidence lives in the
// platform's log viewer. This says which of the two it is, in one request.
//
// Prisma 6 is awkward here — a connection failure arrives as a PrismaClientInitializationError
// whose `code` and `errorCode` are both undefined, so the message is the only reliable signal.
// Query-time faults (missing table or column) do carry a code.
const prisma = require('../db');

const UNREACHABLE = /can't reach database server|connection refused|econnrefused|timed out/i;
const NO_SCHEMA = /does not exist in the current database|relation .* does not exist/i;

// Prisma sometimes embeds the full DSN in a message; never let that reach the response.
const redact = (s) => String(s || '').replace(/postgres(ql)?:\/\/[^\s`'"]*/gi, '<redacted>');

// The message opens with blank lines, an "Invalid `prisma.x()` invocation in" preamble and the
// call site (an absolute path). Skip those and return the sentence that names the fault.
function firstMeaningfulLine(message) {
  const lines = String(message || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l
      && /^[a-z]/i.test(l)                     // a sentence, not code-frame chrome
      && l.split(' ').length >= 4
      && !/^invalid `prisma/i.test(l)
      && !/^at /.test(l));
  return redact(lines[0] || '').slice(0, 200);
}

function classify(e) {
  const code = e.code || e.errorCode || null;
  const msg = String(e.message || '');
  if (code === 'P1001' || UNREACHABLE.test(msg)) {
    return { code: code || 'P1001', reachable: false, schema: null,
      hint: 'cannot reach the database server — check DATABASE_URL and that the database is running' };
  }
  if (code === 'P2021' || code === 'P2022' || NO_SCHEMA.test(msg)) {
    return { code: code || 'P2021', reachable: true, schema: false,
      hint: 'the database answered but the tables are missing — `prisma db push` has not run' };
  }
  return { code, reachable: null, schema: null, hint: 'unrecognised failure — see detail' };
}

module.exports = async function dbHealth(_req, res) {
  try {
    const [patients, oncologists] = await Promise.all([
      prisma.patient.count(),
      prisma.oncologist.count(),
    ]);
    res.json({ ok: true, reachable: true, schema: true, counts: { patients, oncologists } });
  } catch (e) {
    const c = classify(e);
    res.status(503).json({ ok: false, ...c, error: e.name || null, detail: firstMeaningfulLine(e.message) });
  }
};
