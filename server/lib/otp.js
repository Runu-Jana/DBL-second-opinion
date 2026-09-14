// OTP delivery — one interface, several channels.
//
// Which channel actually sends is a deployment choice, not a code change: set OTP_CHANNEL to
// `email`, `whatsapp` or `sms`. That matters because WhatsApp and SMS both depend on account
// setup that can stall (a WhatsApp Business number and template approval; TRAI DLT registration
// for SMS), while email works the moment Resend is configured. Start on email, flip the variable
// when the messaging account is live — nothing else changes.
//
// Every adapter takes the same shape and reports back which channel ran, so callers never care
// who sent it. Unconfigured channels fall back to DEV mode (the code is logged, not sent), which
// routes/contact.js refuses to accept in production.

const { sendOtpEmail, emailConfigured } = require('./email');
const { sendOtp: sendWhatsappOtp, whatsappConfigured, normalizePhone } = require('./whatsapp');
const { sendSmsOtp, smsConfigured } = require('./sms');

const CHANNEL = (process.env.OTP_CHANNEL || 'email').toLowerCase();

// What the visitor has to give us for the active channel — the lead form asks for this, so
// switching channels does not need a frontend change.
const TARGETS = { email: 'email', whatsapp: 'phone', sms: 'phone' };

const otpChannel = () => (TARGETS[CHANNEL] ? CHANNEL : 'email');
const otpTarget = () => TARGETS[otpChannel()];

// True when the active channel can actually deliver. Production refuses to issue codes otherwise.
function otpConfigured() {
  if (otpChannel() === 'whatsapp') return whatsappConfigured();
  if (otpChannel() === 'sms') return smsConfigured();
  return emailConfigured();
}

// Sends `code` over the active channel. `to` is an email address or a phone number depending on
// otpTarget(). Throws on a real delivery failure; returns { dev: true } when nothing is wired up.
async function sendCode({ to, name, code }) {
  const channel = otpChannel();
  if (!otpConfigured()) {
    console.log(`[otp:DEV] ${channel} code for ${to} = ${code}  (channel not configured — nothing was sent)`);
    return { dev: true, channel };
  }
  if (channel === 'whatsapp') { await sendWhatsappOtp(to, code); return { dev: false, channel }; }
  if (channel === 'sms') { await sendSmsOtp(to, code); return { dev: false, channel }; }
  await sendOtpEmail({ to, name, code });
  return { dev: false, channel };
}

module.exports = { sendCode, otpChannel, otpTarget, otpConfigured, normalizePhone };
