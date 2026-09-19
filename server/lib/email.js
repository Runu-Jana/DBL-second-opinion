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

// Invite a newly-created doctor/staff member to set their own Doctor Portal password.
// Best-effort; returns { skipped:true } when email isn't configured.
async function sendDoctorInvite({ to, name, url, loginUrl }) {
  if (!emailConfigured()) return { skipped: true };
  const from = process.env.CONTACT_FROM || 'DBL International <onboarding@resend.dev>';
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;color:#0f1b2d">
      <h2 style="color:#0b5952;margin:0 0 14px">Set up your doctor account</h2>
      <p>Hi ${esc(name) || 'Doctor'}, your DBL International specialist account has been created.</p>
      <p>To finish setting up, choose your password below. You'll then sign in to the Doctor Portal with
         <strong>${esc(to)}</strong> and the password you pick.</p>
      <p style="margin:18px 0"><a href="${esc(url)}" style="background:#0b7d70;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:700;display:inline-block">Set my password</a></p>
      <p style="color:#42506a;font-size:13px">This link expires in 7 days. If it does, ask the DBL team to send you a new one.</p>
      <p style="background:#f2faf8;border:1px solid #d7ede9;border-radius:8px;padding:12px;font-size:13px;color:#0f1b2d">
        <strong>Where to sign in:</strong> always use the Doctor Portal at
        <a href="${esc(loginUrl || '')}">${esc(loginUrl || '')}</a><br>
        The &ldquo;Login&rdquo; button on the main website is for <em>patients</em> and will not accept your details.
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:18px">Or paste this link into your browser:<br>${esc(url)}</p>
    </div>`;
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject: 'Set up your DBL International doctor account', html }),
  });
  if (!resp.ok) { const body = await resp.text().catch(() => ''); throw new Error(`Resend ${resp.status}: ${body.slice(0, 300)}`); }
  return { ok: true };
}

// One-time verification code for the lead pop-up. Deliberately plain: no marketing, no other
// links, and the code repeated in the subject so it is readable from a phone's notification.
async function sendOtpEmail({ to, name, code }) {
  if (!emailConfigured()) return { skipped: true };
  if (!looksEmail(to)) throw new Error('Invalid email address.');
  const from = process.env.CONTACT_FROM || 'DBL International <onboarding@resend.dev>';
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;color:#0f1b2d">
      <h2 style="color:#0b5952;margin:0 0 12px">Your verification code</h2>
      <p>Hi ${esc(name) || 'there'}, use this code to confirm your request for a second opinion.</p>
      <p style="font-size:31px;font-weight:700;letter-spacing:7px;color:#0b7d70;background:#f2faf8;border:1px solid #d7ede9;border-radius:10px;padding:14px 0;text-align:center;margin:18px 0">${esc(code)}</p>
      <p style="color:#42506a;font-size:13px">The code expires in 5 minutes. If you did not ask for it you can ignore this email — nobody can use it without your inbox.</p>
    </div>`;
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject: `${code} is your DBL International verification code`, html }),
  });
  if (!resp.ok) { const body = await resp.text().catch(() => ''); throw new Error(`Resend ${resp.status}: ${body.slice(0, 300)}`); }
  return { ok: true };
}

// Tell the patient their second opinion is ready. The opinion itself is not put in the email —
// it is medical information about them, and email is not a place to leave it lying around; they
// sign in to read and download it.
async function sendOpinionReady({ to, name, doctor, url }) {
  if (!emailConfigured()) return { skipped: true };
  if (!looksEmail(to)) return { skipped: true, reason: 'no email on record' };
  const from = process.env.CONTACT_FROM || 'DBL International <onboarding@resend.dev>';
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;color:#0f1b2d">
      <h2 style="color:#0b5952;margin:0 0 14px">Your second opinion is ready</h2>
      <p>Hi ${esc(name) || 'there'}, ${esc(doctor) || 'our specialist'} has completed the review of the reports you sent us.</p>
      <p style="margin:18px 0"><a href="${esc(url)}" style="background:#0b7d70;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:700;display:inline-block">Read your opinion</a></p>
      <p style="color:#42506a;font-size:13px">Sign in to read it in full, download it, or print a copy. We have not put the details in this email — it is your medical information, and your account is the safer place for it.</p>
      <p style="color:#94a3b8;font-size:12px;margin-top:18px">If you have questions, reply to this email and our care team will help.</p>
    </div>`;
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject: 'Your second opinion is ready — DBL International', html }),
  });
  if (!resp.ok) { const body = await resp.text().catch(() => ''); throw new Error(`Resend ${resp.status}: ${body.slice(0, 300)}`); }
  return { ok: true };
}

module.exports = { sendContactNotification, sendPasswordReset, sendDoctorInvite, sendOtpEmail, sendOpinionReady, emailConfigured };
