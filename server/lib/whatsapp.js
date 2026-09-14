// WhatsApp OTP sender — Meta WhatsApp Cloud API, or any provider that speaks the same shape.
//
// Meta bills post-paid against a card, which in India needs an RBI e-mandate most debit cards
// cannot register. The way around that is a reseller (BSP) who bills in INR: several of them
// — 360dialog and MSG91 among others — expose a Cloud API-compatible endpoint, so the message
// body below is sent unchanged and only the URL and auth header differ. Hence WHATSAPP_BASE_URL
// and WHATSAPP_AUTH_HEADER: point them at the provider and nothing else here changes.
//
//   Meta direct   WHATSAPP_BASE_URL unset (defaults to graph.facebook.com/<version>/<phone id>)
//                 WHATSAPP_TOKEN=<permanent token>   WHATSAPP_PHONE_ID=<phone number id>
//   360dialog     WHATSAPP_BASE_URL=https://waba-v2.360dialog.io
//                 WHATSAPP_AUTH_HEADER=D360-API-KEY  WHATSAPP_TOKEN=<api key>
//
// Unlike SMS, WhatsApp needs no TRAI DLT registration — Meta template approval takes its place.
// Expects an approved **authentication** template (name in WHATSAPP_OTP_TEMPLATE) with the
// standard shape: one body variable (the code) + a "copy code" URL button.
//
// Unconfigured, this reports itself unavailable and lib/otp.js falls back to DEV mode.
const TOKEN = process.env.WHATSAPP_TOKEN || '';
const PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';               // the phone number ID (not the number)
const TEMPLATE = process.env.WHATSAPP_OTP_TEMPLATE || 'otp_verification';
const LANG = process.env.WHATSAPP_OTP_LANG || 'en';
const GRAPH = process.env.WHATSAPP_GRAPH_VERSION || 'v20.0';
const DEFAULT_CC = process.env.WHATSAPP_DEFAULT_CC || '91';         // assumed country code for bare local numbers
const BASE_URL = process.env.WHATSAPP_BASE_URL || '';                // set for a reseller; empty = Meta direct
const AUTH_HEADER = process.env.WHATSAPP_AUTH_HEADER || 'Authorization';

const whatsappConfigured = () => Boolean(TOKEN && (PHONE_ID || BASE_URL));

// Normalise a phone to digits with a country code (no +, spaces, or dashes).
// A bare 10-digit number is assumed to be in DEFAULT_CC.
function normalizePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '').replace(/^0+/, '');
  if (!d) return '';
  if (d.length === 10) d = DEFAULT_CC + d;
  return d;
}

async function sendOtp(phone, code) {
  const to = normalizePhone(phone);
  if (!to) throw new Error('Invalid phone number.');

  if (!whatsappConfigured()) {
    console.log(`[whatsapp:DEV] OTP for +${to} = ${code}  (set WHATSAPP_TOKEN + WHATSAPP_PHONE_ID to send for real)`);
    return { dev: true };
  }

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: TEMPLATE,
      language: { code: LANG },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: code }] },
        { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
      ],
    },
  };

  const url = BASE_URL
    ? `${BASE_URL.replace(/\/+$/, '')}/messages`
    : `https://graph.facebook.com/${GRAPH}/${PHONE_ID}/messages`;
  const auth = AUTH_HEADER === 'Authorization' ? `Bearer ${TOKEN}` : TOKEN;

  const res = await fetch(url, {
    method: 'POST',
    headers: { [AUTH_HEADER]: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`WhatsApp send failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return { dev: false };
}

module.exports = { sendOtp, normalizePhone, whatsappConfigured };
