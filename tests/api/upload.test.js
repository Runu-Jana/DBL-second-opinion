(async () => {
const B = 'http://localhost:5500/api/upload/report';
let pass = 0, fail = 0;
const check = (n, got, want) => { const ok = got === want; ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `  (got ${got}, want ${want})`}`); };

const send = async (files, name = 'Upload Probe') => {
  const fd = new FormData();
  fd.append('patientName', name);
  for (const f of files) fd.append('reports', new Blob([f.buf], { type: f.type }), f.name);
  const r = await fetch(B, { method: 'POST', body: fd });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const buf = (n) => Buffer.alloc(n, 1);

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// accepted types
check('PDF accepted',  (await send([{ buf: buf(1000), type: 'application/pdf', name: 'scan.pdf' }])).status, 201);
check('DOCX accepted', (await send([{ buf: buf(1000), type: DOCX, name: 'summary.docx' }])).status, 201);
check('DOC accepted',  (await send([{ buf: buf(1000), type: 'application/msword', name: 'old.doc' }])).status, 201);
check('MP4 accepted',  (await send([{ buf: buf(1000), type: 'video/mp4', name: 'clip.mp4' }])).status, 201);
check('MOV accepted',  (await send([{ buf: buf(1000), type: 'video/quicktime', name: 'clip.mov' }])).status, 201);
check('JPG accepted',  (await send([{ buf: buf(1000), type: 'image/jpeg', name: 'x.jpg' }])).status, 201);

// still rejected
const bad = await send([{ buf: buf(1000), type: 'application/x-msdownload', name: 'evil.exe' }]);
check('EXE refused', bad.status, 400);
check('EXE message names the allowed set', /PDF, Word, JPG, PNG or video/.test(bad.body.error || ''), true);

// size rules
const bigDoc = await send([{ buf: buf(16 * 1024 * 1024), type: 'application/pdf', name: 'huge.pdf' }]);
check('16 MB PDF refused', bigDoc.status, 400);
check('  message says 15 MB for documents', /under 15 MB/.test(bigDoc.body.error || ''), true);
check('20 MB video accepted (over the doc cap)', (await send([{ buf: buf(20 * 1024 * 1024), type: 'video/mp4', name: 'big.mp4' }])).status, 201);

// video count
const three = await send([
  { buf: buf(1000), type: 'video/mp4', name: 'a.mp4' },
  { buf: buf(1000), type: 'video/mp4', name: 'b.mp4' },
  { buf: buf(1000), type: 'video/mp4', name: 'c.mp4' }]);
check('3 videos refused', three.status, 400);
check('  message names the limit', /at most 2 videos/.test(three.body.error || ''), true);

// oversized request rejected before buffering
// Node's fetch (undici) refuses to send a body shorter than its Content-Length, so this request
// goes through http.request, which sends exactly what it is told. big.test.js proves the same
// guard over a raw socket; this one checks it through the normal client path.
const r = await new Promise((resolve, reject) => {
  const req = require('http').request(B, {
    method: 'POST',
    headers: { 'content-length': String(300 * 1024 * 1024), 'content-type': 'multipart/form-data; boundary=x' },
  }, (res) => { res.resume(); resolve({ status: res.statusCode }); req.destroy(); });
  req.on('error', reject);
  req.write('x');
});
check('oversized request refused with 413', r.status, 413);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
