// SMS OTP sender — MSG91 (an Indian provider; prepaid, so no card mandate is involved).
//
// Gated by env: set MSG91_AUTH_KEY + MSG91_OTP_TEMPLATE_ID to go live. Until then this reports
// itself unconfigured and lib/otp.js falls back to DEV mode.
//
// Note for whoever sets this up: sending SMS to Indian numbers requires TRAI **DLT** registration
// (the business entity, a sender ID and the message template are registered with the telecom
// operators) before any template ID exists. That is paperwork done in MSG91's dashboard, not
// something this code can do. WhatsApp has no such requirement — see lib/whatsapp.js.

const AUTH_KEY = process.env.MSG91_AUTH_KEY || '';
const TEMPLATE_ID = process.env.MSG91_OTP_TEMPLATE_ID || '';   // the DLT-approved template
const SENDER = process.env.MSG91_SENDER_ID || '';              // 6-character DLT header, optional
const BASE = process.env.MSG91_BASE_URL || 'https://control.msg91.com/api/v5';

const smsConfigured = () => Boolean(AUTH_KEY && TEMPLATE_ID);

// MSG91 wants the full international number without a leading +.
async function sendSmsOtp(phone, code) {
  const to = String(phone || '').replace(/\D/g, '');
  if (!to) throw new Error('Invalid phone number.');
  if (!smsConfigured()) throw new Error('SMS is not configured.');

  const url = new URL(`${BASE}/otp`);
  url.searchParams.set('template_id', TEMPLATE_ID);
  url.searchParams.set('mobile', to);
  url.searchParams.set('otp', code);
  if (SENDER) url.searchParams.set('sender', SENDER);

  const res = await fetch(url, { method: 'POST', headers: { authkey: AUTH_KEY, 'Content-Type': 'application/json' } });
  const body = await res.text().catch(() => '');
  // MSG91 answers 200 with {"type":"error"} on rejection, so the status code alone is not enough.
  if (!res.ok || /"type"\s*:\s*"error"/.test(body)) {
    throw new Error(`MSG91 send failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return { ok: true };
}

module.exports = { sendSmsOtp, smsConfigured };
