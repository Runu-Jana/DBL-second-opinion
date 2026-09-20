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
    // What the patient actually wants to know. Asked at upload time, while they are thinking
    // about their own case — not left for a counsellor to guess at from the scans.
    const questions = String(req.body.questions || '').trim().slice(0, 4000);
    const now = new Date();
    const date = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
    try {
      // Work out whose documents these are. Email and name are not equal evidence: an email
      // identifies one person, a name does not. Matching them with a single OR let a namesake
      // who happened to be created first win over the person whose email actually matched —
      // attaching one patient's medical documents to another's record.
      let patient = null;
      let ambiguous = false;

      if (email) {
        patient = await prisma.patient.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
      }
      if (!patient && patientName && patientName !== 'Website Visitor') {
        const namesakes = await prisma.patient.findMany({
          where: { name: { equals: patientName, mode: 'insensitive' } },
          take: 2,
        });
        if (namesakes.length === 1) patient = namesakes[0];
        // Two people with this name and nothing else to tell them apart. Guessing here means a
        // 50% chance of filing a scan under the wrong patient, so leave it for a human instead.
        else if (namesakes.length > 1) ambiguous = true;
      }
      if (!patient && !ambiguous && patientName && patientName !== 'Website Visitor') {
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
          notes: [
            email ? `Submitted via website by ${email}` : 'Submitted via website',
            f.name,
            ambiguous ? `NEEDS MATCHING: more than one patient is called ${patientName} and no email was given` : null,
          ].filter(Boolean).join(' · '),
        },
      })));
      // Receipt matters here: files vanish into a form and nothing visibly happens otherwise.
      if (questions && patientUhid) {
        const existing = await prisma.secondOpinion.findFirst({ where: { patientUhid } });
        if (existing) {
          // A second upload adds to the question list rather than overwriting the first.
          const merged = existing.patientQuestions
            ? `${existing.patientQuestions}\n\n[${date}] ${questions}`
            : questions;
          await prisma.secondOpinion.update({ where: { id: existing.id }, data: { patientQuestions: merged } })
            .catch((e) => console.error('could not save questions:', e.message));
        } else {
          await prisma.secondOpinion.create({
            data: {
              patientName, patientUhid, patientQuestions: questions,
              submittedDate: date, status: 'Awaiting Review', priority: 'Normal',
            },
          }).catch((e) => console.error('could not open the case:', e.message));
        }
      }

      await notifyPatient(patientUhid, { kind: 'report', title: 'We have received your reports',
        body: `${created.length} document${created.length === 1 ? '' : 's'} received. Our team will review them and come back to you.`, link: '/dashboard/cases' });
      await notifyCounsellors({ kind: 'report', title: 'New documents awaiting triage',
        body: `${patientName} uploaded ${created.length} document${created.length === 1 ? '' : 's'}.`, link: null });
      res.status(201).json({ ok: true, count: created.length, patientUhid });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Could not save your reports.' }); }
  });
});

module.exports = router;
