// Email notifications via Resend (optional). If RESEND_API_KEY is unset this is a no-op, so the
// app keeps working — contact messages always save to the DB and show in admin regardless of email.
const emailConfigured = () => !!process.env.RESEND_API_KEY;

const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const looksEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ''));

// Notify the team of a new contact-form submission. Best-effort: throws on failure so the
// caller can log it, but the caller must not block the user's request on this.
async function sendContactNotification({ name, email, subject, message }) {
  if (!emailConfigured()) return { skipped: true };
  const to = process.env.CONTACT_TO || process.env.ADMIN_EMAIL;
  const from = process.env.CONTACT_FROM || 'DBL International <onboarding@resend.dev>';
  if (!to) return { skipped: true, reason: 'no recipient (set CONTACT_TO or ADMIN_EMAIL)' };

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;color:#0f1b2d">
      <h2 style="color:#0b5952;margin:0 0 14px">New contact message</h2>
      <p style="margin:3px 0"><strong>Name:</strong> ${esc(name)}</p>
      <p style="margin:3px 0"><strong>Email:</strong> ${esc(email)}</p>
      <p style="margin:3px 0"><strong>Subject:</strong> ${esc(subject || '(none)')}</p>
      <p style="margin:14px 0 6px"><strong>Message</strong></p>
      <div style="white-space:pre-wrap;background:#f2faf8;border:1px solid #d7ede9;border-radius:8px;padding:12px">${esc(message)}</div>
      <p style="color:#94a3b8;font-size:12px;margin-top:18px">Sent from the DBL International contact form. Reply directly to this email to respond to ${esc(name)}.</p>
    </div>`;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      // so hitting "Reply" answers the customer directly (only when we have a real email)
      ...(looksEmail(email) ? { reply_to: email } : {}),
      subject: `New enquiry: ${subject || 'Contact form'}`,
      html,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Resend ${resp.status}: ${body.slice(0, 300)}`);
  }
  return { ok: true };
}

// Send a patient a password-reset link. Best-effort; returns { skipped:true } if email is off.
async function sendPasswordReset({ to, name, url }) {
  if (!emailConfigured()) return { skipped: true };
  const from = process.env.CONTACT_FROM || 'DBL International <onboarding@resend.dev>';
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;color:#0f1b2d">
      <h2 style="color:#0b5952;margin:0 0 14px">Reset your password</h2>
      <p>Hi ${esc(name) || 'there'}, we received a request to reset your DBL International password.</p>
      <p style="margin:18px 0"><a href="${esc(url)}" style="background:#0b7d70;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:700;display:inline-block">Reset password</a></p>
      <p style="color:#42506a;font-size:13px">This link expires in 30 minutes. If you didn't request it, you can ignore this email — your password won't change.</p>
      <p style="color:#94a3b8;font-size:12px;margin-top:18px">Or paste this link into your browser:<br>${esc(url)}</p>
    </div>`;
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject: 'Reset your DBL International password', html }),
  });
  if (!resp.ok) { const body = await resp.text().catch(() => ''); throw new Error(`Resend ${resp.status}: ${body.slice(0, 300)}`); }
  return { ok: true };
}

module.exports = { sendContactNotification, sendPasswordReset, emailConfigured };
