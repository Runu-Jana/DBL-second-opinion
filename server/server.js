// DBL International — Express server: serves the static frontend + JSON API
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

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
const storage = require('./lib/storage');
const M = require('./routes/modules');

const app = express();
const PORT = process.env.PORT || 5177;
const ROOT = path.join(__dirname, '..');
const CLIENT_DIST = path.join(ROOT, 'client', 'dist');

app.use(cors());
app.use(express.json());

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

// ---- Built React app (client/dist) ----
app.use(express.static(CLIENT_DIST));

// SPA fallback: all non-API routes are handled by React Router
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`DBL International running at http://localhost:${PORT}`);
  console.log(`  • Site:        http://localhost:${PORT}/`);
  console.log(`  • Oncologists: http://localhost:${PORT}/oncologists`);
  console.log(`  • Admin:       http://localhost:${PORT}/admin`);
});
