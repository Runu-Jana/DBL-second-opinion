// undici validates content-length, so use a raw socket to prove the pre-parse guard fires
// before any body is read.
const net = require('net');
const sock = net.connect(5500, '127.0.0.1', () => {
  sock.write(
    'POST /api/upload/report HTTP/1.1\r\n' +
    'Host: 127.0.0.1:5500\r\n' +
    'Content-Type: multipart/form-data; boundary=zzz\r\n' +
    'Content-Length: ' + (300 * 1024 * 1024) + '\r\n' +
    'Connection: close\r\n\r\n');
  // Deliberately send almost nothing: if the guard works we are refused without the body.
});
let out = '';
sock.on('data', (d) => { out += d; });
sock.on('close', () => {
  const status = (out.split('\r\n')[0] || '').trim();
  const body = out.split('\r\n\r\n').slice(1).join('\r\n\r\n').trim();
  console.log('status :', status);
  console.log('body   :', body.slice(-200));
  const ok = /413/.test(status);
  console.log(ok ? 'PASS  oversized request refused before the body was sent' : 'FAIL  expected 413');
  process.exit(ok ? 0 : 1);
});
setTimeout(() => { console.log('FAIL  no response'); process.exit(1); }, 15000);
