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

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ---- Uploaded doctor photos ----
app.use('/uploads', express.static(path.join(ROOT, 'uploads')));

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
