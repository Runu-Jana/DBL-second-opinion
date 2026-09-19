// DBL International — Express server: serves the static frontend + JSON API
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const oncologistsRouter = require('./routes/oncologists');
const servicesRouter = require('./routes/services');
const pricingRouter = require('./routes/pricing');
const blogRouter = require('./routes/blog');
const authRouter = require('./routes/auth');
const uploadRouter = require('./routes/upload');
const patientsRouter = require('./routes/patients');
const staffRouter = require('./routes/staff');
const appointmentsRouter = require('./routes/appointments');
const consultationsRouter = require('./routes/consultations');
const doctorRouter = require('./routes/doctor');
const patientPortalRouter = require('./routes/patient');
const doctorApplicationsRouter = require('./routes/doctorApplications');
const contactRouter = require('./routes/contact');
const messagesRouter = require('./routes/messages');
const chatRouter = require('./routes/chat');
const storage = require('./lib/storage');
const M = require('./routes/modules');

const app = express();
const PORT = process.env.PORT || 5177;
const ROOT = path.join(__dirname, '..');
const CLIENT_DIST = path.join(ROOT, 'client', 'dist');

// Behind Render's proxy — required so rate limiting sees the real client IP.
app.set('trust proxy', 1);

// Security headers. CSP is left off so it won't block the bundled SPA or cross-origin
// (R2) images; the rest — HSTS, X-Frame-Options, nosniff, referrer-policy — are applied.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS — restrict to an allowlist in production. Set CORS_ORIGINS="https://yourdomain.com"
// (comma-separated for several). Unset = reflect origin (fine for local dev).
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : true }));

app.use(express.json({ limit: '1mb' }));

// Throttle sensitive endpoints per IP against brute force / abuse (and API-cost blowouts).
const limiter = (windowMs, max) => rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in a little while.' } });
app.use('/api/auth', limiter(15 * 60 * 1000, 40));         // login / signup / forgot / reset
app.use('/api/contact/otp', limiter(10 * 60 * 1000, 12));  // WhatsApp OTP (cost + spam)
app.use('/api/chat', limiter(60 * 1000, 20));              // AI chat (Anthropic cost)
app.use('/api/upload', limiter(15 * 60 * 1000, 30));   // public report uploads (memory + storage cost)

// ---- API ----
app.use('/api/oncologists', oncologistsRouter);
app.use('/api/services', servicesRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/blog', blogRouter);
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/staff', staffRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/consultations', consultationsRouter);
app.use('/api/doctor', doctorRouter);
app.use('/api/portal', patientPortalRouter);
app.use('/api/doctor-applications', doctorApplicationsRouter);
app.use('/api/contact', contactRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/chat', chatRouter);
app.use('/api/reports', M.reports);
app.use('/api/treatment-plans', M.treatmentPlans);
app.use('/api/second-opinions', M.secondOpinions);
app.use('/api/medications', M.medications);
app.use('/api/invoices', M.invoices);
app.use('/api/lab-tests', M.labTests);
app.use('/api/users', M.users);
app.use('/api/announcements', M.announcements);
app.use('/api/activity', M.activity);
app.use('/api/settings', M.settings);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Deep check — says whether the database is reachable AND whether the schema was pushed.
app.get('/api/health/db', require('./lib/dbhealth'));

// ---- Uploaded files (doctor photos, patient reports) — streamed from R2 or local disk ----
app.get('/uploads/:key', async (req, res) => {
  try {
    const found = await storage.streamTo(req.params.key, res);
    if (!found && !res.headersSent) res.status(404).send('Not found');
  } catch (e) {
    console.error('file stream error:', e);
    if (!res.headersSent) res.status(500).send('Error serving file');
  }
});

// ---- SEO: robots.txt + a live sitemap (host-aware, so it works on any domain) ----
const baseUrl = (req) => `${req.protocol}://${req.get('host')}`;

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      'Disallow: /doctor',
      'Disallow: /dashboard',
      'Disallow: /api/',
      'Disallow: /report',
      '',
      `Sitemap: ${baseUrl(req)}/sitemap.xml`,
      '',
    ].join('\n'),
  );
});

// Public, indexable pages. Login-gated areas (admin/doctor/dashboard) are intentionally omitted.
const STATIC_PAGES = ['/', '/oncologists', '/services', '/how-it-works', '/upload-reports', '/pricing', '/contact', '/resources', '/about', '/privacy', '/terms'];

app.get('/sitemap.xml', async (req, res) => {
  const base = baseUrl(req);
  const urls = STATIC_PAGES.map((p) => ({ loc: base + p, priority: p === '/' ? '1.0' : '0.7' }));
  try {
    const prisma = require('./db');
    const [docs, services] = await Promise.all([
      prisma.oncologist.findMany({ where: { active: true }, select: { id: true, updatedAt: true } }),
      prisma.service.findMany({ where: { active: true }, select: { id: true, updatedAt: true } }),
    ]);
    for (const d of docs) urls.push({ loc: `${base}/oncologists/${d.id}`, lastmod: d.updatedAt, priority: '0.6' });
    for (const s of services) urls.push({ loc: `${base}/services/${s.id}`, lastmod: s.updatedAt, priority: '0.6' });
  } catch (e) { console.error('sitemap db error:', e.message); /* still return the static pages */ }

  const body = urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}<changefreq>weekly</changefreq><priority>${u.priority}</priority></url>`).join('\n');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
});

// ---- Built React app (client/dist) ----
app.use(express.static(CLIENT_DIST));

// SPA fallback: all non-API routes are handled by React Router
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});

// Bind every interface, not just loopback: container platforms (Railway, Fly, Docker) route
// traffic in from outside the container and can't reach a server bound only to localhost.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`DBL International running at http://localhost:${PORT}`);
  console.log(`  • Site:        http://localhost:${PORT}/`);
  console.log(`  • Oncologists: http://localhost:${PORT}/oncologists`);
  console.log(`  • Admin:       http://localhost:${PORT}/admin`);
});
