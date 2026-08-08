// Image upload for doctor photos (admin only)
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { requireAdmin } = require('./auth');

const express = require('express');
const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

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

// POST /api/upload  (multipart, field "photo") -> { url }
router.post('/', requireAdmin, (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    res.json({ url: '/uploads/' + req.file.filename });
  });
});

module.exports = router;
