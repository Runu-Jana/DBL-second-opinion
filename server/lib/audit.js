// Central activity/audit logger. Writes an ActivityLog row for a mutation.
// Fire-and-forget: logging must NEVER break or delay the main request.
const prisma = require('../db');

function actorOf(req) {
  if (req && req.admin) return req.admin.name || req.admin.email || 'Admin';
  if (req && req.doctor) return req.doctor.name || 'Doctor';
  return 'System';
}

// kind: 'audit' (change trail) | 'activity' (friendly feed)
function logActivity(req, { action, target = null, category = null, kind = 'audit', actor } = {}) {
  prisma.activityLog
    .create({ data: { kind, actor: actor || actorOf(req), action, target, category } })
    .catch(() => { /* swallow — never surface logging failures to the caller */ });
}

// Log a CRUD mutation as an audit row (+ optional friendly activity row for creates).
function logCrud(req, verb, noun, name, { activity = false } = {}) {
  const target = name ? `${noun} · ${name}` : noun;
  logActivity(req, { kind: 'audit', action: verb, target, category: noun });
  if (activity && verb === 'Created') {
    logActivity(req, { kind: 'activity', action: `New ${noun.toLowerCase()} added: ${name || '—'}`, category: noun });
  }
}

module.exports = { logActivity, logCrud, actorOf };
