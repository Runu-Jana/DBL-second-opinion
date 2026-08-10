// Image upload for doctor photos (admin only)
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { requireAdmin } = require('./auth');
const prisma = require('../db');

const express = require('express');
const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const ALLOWED_REPORT = ['application/pdf', 'image/jpeg', 'image/png'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase() || '.jpg';
    cb(null, crypto.randomUUID() + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPG, PNG or WEBP images are allowed.'));
  },
});

const uploadVideo = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_VIDEO.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only MP4, WebM, OGG or MOV videos are allowed.'));
  },
});

// POST /api/upload  (multipart, field "photo") -> { url }
router.post('/', requireAdmin, (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    res.json({ url: '/uploads/' + req.file.filename });
  });
});

// POST /api/upload/video  (multipart, field "video") -> { url }
router.post('/video', requireAdmin, (req, res) => {
  uploadVideo.single('video')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Video is too large (max 100 MB).' : err.message;
      return res.status(400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    res.json({ url: '/uploads/' + req.file.filename });
  });
});

// Patient report submissions — PDF/JPG/PNG, up to 15 MB each
const uploadReport = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_REPORT.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF, JPG or PNG files are allowed.'));
  },
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
      // Find the patient (by email or name) to link the report. If they don't exist yet,
      // auto-register them. Reports are NOT routed to a doctor here — they land in the admin
      // triage queue (category = null, doctor = null) until a counselor categorises them.
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

      const created = await Promise.all(req.files.map((f) => prisma.report.create({
        data: {
          patientName,
          patientUhid,
          category: null, // awaiting counselor triage
          doctor: null,   // assigned by round-robin once categorised
          type: 'Patient Upload',
          date,
          fileUrl: '/uploads/' + f.filename,
          status: 'Pending Review',
          notes: email ? `Submitted via website by ${email} · ${f.originalname}` : `Submitted via website · ${f.originalname}`,
        },
      })));
      res.status(201).json({ ok: true, count: created.length, patientUhid });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Could not save your reports.' }); }
  });
});

module.exports = router;
