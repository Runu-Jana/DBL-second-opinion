// WhatsApp OTP sender — Meta WhatsApp Cloud API.
//
// Gated by env: when WHATSAPP_TOKEN + WHATSAPP_PHONE_ID are set, it sends a real
// WhatsApp message via Meta's Cloud API. Otherwise it runs in DEV mode — it just
// logs the code to the server console so the whole flow is testable before a live
// WhatsApp Business number exists. Add the two env vars to switch it live; no code
// change needed.
//
// Expects an approved Meta **authentication** template (name in WHATSAPP_OTP_TEMPLATE)
// with the standard shape: one body variable (the code) + a "copy code" URL button.

const TOKEN = process.env.WHATSAPP_TOKEN || '';
const PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';               // the phone number ID (not the number)
const TEMPLATE = process.env.WHATSAPP_OTP_TEMPLATE || 'otp_verification';
const LANG = process.env.WHATSAPP_OTP_LANG || 'en';
const GRAPH = process.env.WHATSAPP_GRAPH_VERSION || 'v20.0';
const DEFAULT_CC = process.env.WHATSAPP_DEFAULT_CC || '91';         // assumed country code for bare local numbers

const whatsappConfigured = () => Boolean(TOKEN && PHONE_ID);

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

  const res = await fetch(`https://graph.facebook.com/${GRAPH}/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`WhatsApp send failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return { dev: false };
}

module.exports = { sendOtp, normalizePhone, whatsappConfigured };
