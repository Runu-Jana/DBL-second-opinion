// Uploads — doctor photos/videos (admin) + patient report submissions (public).
// Files are held in memory by multer, then handed to lib/storage (Cloudflare R2 in prod,
// local disk in dev). The stored URL is always /uploads/<key>, served by server.js.
const multer = require('multer');
const { requireAdmin } = require('./auth');
const prisma = require('../db');
const storage = require('../lib/storage');
const { notifyPatient, notifyCounsellors } = require('../lib/notify');

const express = require('express');
const router = express.Router();

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const ALLOWED_DOC = ['application/pdf', 'image/jpeg', 'image/png',
  'application/msword',                                                       // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];  // .docx
const ALLOWED_REPORT = [...ALLOWED_DOC, ...ALLOWED_VIDEO];

// Multer buffers uploads in memory and /report is public, so the ceiling here is the amount
// of RAM one anonymous request can claim. Documents stay at 15 MB; video gets more, but only
// a couple per submission, and the whole request is refused up front if it is oversized.
const DOC_MAX = 15 * 1024 * 1024;
const VIDEO_MAX = 50 * 1024 * 1024;
const VIDEO_COUNT_MAX = 2;
const REQUEST_MAX = 220 * 1024 * 1024;
const mb = (n) => Math.round(n / (1024 * 1024));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const memory = multer.memoryStorage();
const only = (types, msg) => (_req, file, cb) => (types.includes(file.mimetype) ? cb(null, true) : cb(new Error(msg)));

const upload = multer({ storage: memory, limits: { fileSize: 3 * 1024 * 1024 }, fileFilter: only(ALLOWED, 'Only JPG, PNG or WEBP images are allowed.') });
const uploadVideo = multer({ storage: memory, limits: { fileSize: 100 * 1024 * 1024 }, fileFilter: only(ALLOWED_VIDEO, 'Only MP4, WebM, OGG or MOV videos are allowed.') });
const uploadReport = multer({ storage: memory, limits: { fileSize: VIDEO_MAX, files: 10 }, fileFilter: only(ALLOWED_REPORT, 'Only PDF, Word, JPG, PNG or video files are allowed.') });

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
  // Checked before multer runs: once parsing starts the memory is already committed.
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > REQUEST_MAX) {
    return res.status(413).json({ error: `That upload is too large (max ${mb(REQUEST_MAX)} MB in total). Please send fewer or smaller files.` });
  }
  uploadReport.array('reports', 10)(req, res, async (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? `Videos must be under ${mb(VIDEO_MAX)} MB and other files under ${mb(DOC_MAX)} MB.` : err.message;
      return res.status(400).json({ error: msg });
    }
    if (!req.files || !req.files.length) return res.status(400).json({ error: 'No files uploaded.' });

    // multer's single fileSize had to be the video ceiling, so hold documents to their own.
    const tooBig = req.files.find((x) => !ALLOWED_VIDEO.includes(x.mimetype) && x.size > DOC_MAX);
    if (tooBig) return res.status(400).json({ error: `${tooBig.originalname} is too large — documents and images must be under ${mb(DOC_MAX)} MB.` });
    const videos = req.files.filter((x) => ALLOWED_VIDEO.includes(x.mimetype));
    if (videos.length > VIDEO_COUNT_MAX) {
      return res.status(400).json({ error: `Please attach at most ${VIDEO_COUNT_MAX} videos per submission.` });
    }
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
      // Receipt matters here: files vanish into a form and nothing visibly happens otherwise.
      await notifyPatient(patientUhid, { kind: 'report', title: 'We have received your reports',
        body: `${created.length} document${created.length === 1 ? '' : 's'} received. Our team will review them and come back to you.`, link: '/dashboard/cases' });
      await notifyCounsellors({ kind: 'report', title: 'New documents awaiting triage',
        body: `${patientName} uploaded ${created.length} document${created.length === 1 ? '' : 's'}.`, link: null });
      res.status(201).json({ ok: true, count: created.length, patientUhid });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Could not save your reports.' }); }
  });
});

module.exports = router;
