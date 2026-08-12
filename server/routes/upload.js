// Uploads — doctor photos/videos (admin) + patient report submissions (public).
// Files are held in memory by multer, then handed to lib/storage (Cloudflare R2 in prod,
// local disk in dev). The stored URL is always /uploads/<key>, served by server.js.
const multer = require('multer');
const { requireAdmin } = require('./auth');
const prisma = require('../db');
const storage = require('../lib/storage');

const express = require('express');
const router = express.Router();

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const ALLOWED_REPORT = ['application/pdf', 'image/jpeg', 'image/png'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const memory = multer.memoryStorage();
const only = (types, msg) => (_req, file, cb) => (types.includes(file.mimetype) ? cb(null, true) : cb(new Error(msg)));

const upload = multer({ storage: memory, limits: { fileSize: 3 * 1024 * 1024 }, fileFilter: only(ALLOWED, 'Only JPG, PNG or WEBP images are allowed.') });
const uploadVideo = multer({ storage: memory, limits: { fileSize: 100 * 1024 * 1024 }, fileFilter: only(ALLOWED_VIDEO, 'Only MP4, WebM, OGG or MOV videos are allowed.') });
const uploadReport = multer({ storage: memory, limits: { fileSize: 15 * 1024 * 1024 }, fileFilter: only(ALLOWED_REPORT, 'Only PDF, JPG or PNG files are allowed.') });

// Save one buffered file to storage and return its /uploads/<key> URL.
const store = (file) => storage.saveBuffer(file.buffer, storage.keyFor(file.originalname), file.mimetype).then((key) => '/uploads/' + key);

// POST /api/upload  (multipart, field "photo") -> { url }
router.post('/', requireAdmin, (req, res) => {
  upload.single('photo')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    try { res.json({ url: await store(req.file) }); }
    catch (e) { console.error(e); res.status(500).json({ error: 'Could not save the image.' }); }
  });
});

// POST /api/upload/video  (multipart, field "video") -> { url }
router.post('/video', requireAdmin, (req, res) => {
  uploadVideo.single('video')(req, res, async (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Video is too large (max 100 MB).' : err.message;
      return res.status(400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    try { res.json({ url: await store(req.file) }); }
    catch (e) { console.error(e); res.status(500).json({ error: 'Could not save the video.' }); }
  });
});

// POST /api/upload/report  (public — patient uploads) -> creates "Pending Review" Report records
router.post('/report', (req, res) => {
  uploadReport.array('reports', 10)(req, res, async (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Each file must be under 15 MB.' : err.message;
      return res.status(400).json({ error: msg });
    }
    if (!req.files || !req.files.length) return res.status(400).json({ error: 'No files uploaded.' });
    const patientName = String(req.body.patientName || '').trim() || 'Website Visitor';
    const email = req.body.email ? String(req.body.email).trim() : null;
    const now = new Date();
    const date = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
    try {
      // Find (or auto-register) the patient so the report links to them; reports land in the
      // admin triage queue (category = null, doctor = null) until a counselor categorises them.
      let patient = await prisma.patient.findFirst({
        where: {
          OR: [
            ...(email ? [{ email: { equals: email, mode: 'insensitive' } }] : []),
            { name: { equals: patientName, mode: 'insensitive' } },
          ],
        },
      });
      if (!patient && patientName && patientName !== 'Website Visitor') {
        const uhid = 'DBL' + (100000 + Math.floor(Math.random() * 900000));
        patient = await prisma.patient.create({
          data: { name: patientName, uhid, email, status: 'New Patient', lastVisit: date },
        }).catch(() => null);
      }
      const patientUhid = patient ? patient.uhid || null : null;

      // Upload every file to storage, then create the report rows.
      const uploaded = await Promise.all(req.files.map(async (f) => ({ url: await store(f), name: f.originalname })));
      const created = await Promise.all(uploaded.map((f) => prisma.report.create({
        data: {
          patientName,
          patientUhid,
          category: null,
          doctor: null,
          type: 'Patient Upload',
          date,
          fileUrl: f.url,
          status: 'Pending Review',
          notes: email ? `Submitted via website by ${email} · ${f.name}` : `Submitted via website · ${f.name}`,
        },
      })));
      res.status(201).json({ ok: true, count: created.length, patientUhid });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Could not save your reports.' }); }
  });
});

module.exports = router;
