// File storage — Cloudflare R2 (S3-compatible) in production, local disk as a dev fallback.
// If the R2_* env vars are set, uploads go to the R2 bucket; otherwise files are written to
// ./uploads on disk. Either way the app keeps using /uploads/<key> URLs (served by server.js).
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const R2 = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET,
};
const useR2 = !!(R2.accountId && R2.accessKeyId && R2.secretAccessKey && R2.bucket);

const LOCAL_DIR = path.join(__dirname, '..', '..', 'uploads');

let s3 = null;
if (useR2) {
  const { S3Client } = require('@aws-sdk/client-s3');
  s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2.accessKeyId, secretAccessKey: R2.secretAccessKey },
  });
}

// A safe, unguessable object key from an original filename (keeps the extension).
function keyFor(originalName) {
  const ext = (path.extname(originalName || '') || '').toLowerCase();
  return crypto.randomUUID() + ext;
}

// Keys are flat UUID filenames — strip any path components defensively.
const safeKey = (key) => path.basename(String(key || ''));

// Store a buffer under `key`. Returns the key. The public URL is `/uploads/<key>`.
async function saveBuffer(buffer, key, contentType) {
  const k = safeKey(key);
  if (useR2) {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    await s3.send(new PutObjectCommand({ Bucket: R2.bucket, Key: k, Body: buffer, ContentType: contentType || 'application/octet-stream' }));
  } else {
    fs.mkdirSync(LOCAL_DIR, { recursive: true });
    fs.writeFileSync(path.join(LOCAL_DIR, k), buffer);
  }
  return k;
}

// Stream a stored object to an Express response. Resolves false if the object doesn't exist.
async function streamTo(key, res) {
  const k = safeKey(key);
  if (useR2) {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    try {
      const obj = await s3.send(new GetObjectCommand({ Bucket: R2.bucket, Key: k }));
      if (obj.ContentType) res.setHeader('Content-Type', obj.ContentType);
      if (obj.ContentLength != null) res.setHeader('Content-Length', obj.ContentLength);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      await new Promise((resolve, reject) => {
        obj.Body.on('error', reject).pipe(res).on('finish', resolve).on('error', reject);
      });
      return true;
    } catch (e) {
      if (e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) return false;
      throw e;
    }
  }
  const full = path.join(LOCAL_DIR, k);
  if (!fs.existsSync(full)) return false;
  await new Promise((resolve, reject) => res.sendFile(full, (err) => (err ? reject(err) : resolve())));
  return true;
}

// Fetch a stored object's bytes + content type (for server-side processing, e.g. AI analysis).
// Returns null if the object doesn't exist.
async function getBuffer(key) {
  const k = safeKey(key);
  if (useR2) {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    try {
      const obj = await s3.send(new GetObjectCommand({ Bucket: R2.bucket, Key: k }));
      const chunks = [];
      for await (const chunk of obj.Body) chunks.push(chunk);
      return { buffer: Buffer.concat(chunks), contentType: obj.ContentType || 'application/octet-stream' };
    } catch (e) {
      if (e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) return null;
      throw e;
    }
  }
  const full = path.join(LOCAL_DIR, k);
  if (!fs.existsSync(full)) return null;
  const ext = path.extname(k).toLowerCase();
  const contentType = ext === '.pdf' ? 'application/pdf'
    : ext === '.png' ? 'image/png'
      : (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg' : 'application/octet-stream';
  return { buffer: fs.readFileSync(full), contentType };
}

// Extract the <key> from a stored /uploads/<key> URL (or return the string as-is).
const keyFromUrl = (url) => String(url || '').replace(/^.*\/uploads\//, '');

module.exports = { useR2, keyFor, saveBuffer, streamTo, getBuffer, keyFromUrl, LOCAL_DIR };
