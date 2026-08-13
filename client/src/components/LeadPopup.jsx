import { useEffect, useState } from 'react';
import { api } from '../api.js';

/* Scroll-triggered "second opinion" registration pop-up. Appears once per session after the
   visitor scrolls ~40% down. Captures name + phone, verifies the phone via WhatsApp OTP, and
   only then registers the customer (creates a Patient with a unique code). */
export default function LeadPopup() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState('form'); // form -> otp -> done
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [uhid, setUhid] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [devCode, setDevCode] = useState('');

  useEffect(() => {
    if (sessionStorage.getItem('dbl_lead_shown')) return;
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (h > 0 && window.scrollY / h > 0.4) {
        sessionStorage.setItem('dbl_lead_shown', '1');
        setShow(true);
        window.removeEventListener('scroll', onScroll);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [show]);

  const close = () => setShow(false);

  const sendCode = async (e) => {
    e?.preventDefault();
    if (!name.trim() || !phone.trim()) { setErr('Please enter your name and phone number.'); return; }
    setErr(''); setBusy(true);
    try {
      const r = await api('/contact/otp/send', { method: 'POST', auth: false, body: JSON.stringify({ name: name.trim(), phone: phone.trim() }) });
      setDevCode(r.devCode || '');
      setCode(r.devCode || '');
      setStep('otp');
    } catch (ex) { setErr(ex.message || 'Could not send the code. Please try again.'); }
    finally { setBusy(false); }
  };

  const verify = async (e) => {
    e?.preventDefault();
    if (code.trim().length < 4) { setErr('Enter the code we sent you.'); return; }
    setErr(''); setBusy(true);
    try {
      const r = await api('/contact/otp/verify', { method: 'POST', auth: false, body: JSON.stringify({ name: name.trim(), phone: phone.trim(), code: code.trim() }) });
      setUhid(r.uhid || '');
      setStep('done');
    } catch (ex) { setErr(ex.message || 'Could not verify the code. Please try again.'); }
    finally { setBusy(false); }
  };

  if (!show) return null;
  return (
    <div className="lead-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="lead-modal" role="dialog" aria-modal="true" aria-label="Get a second opinion">
        <button className="lead-close" onClick={close} aria-label="Close">&times;</button>
        <div className="lead-banner">
          <div className="lead-banner-text">
            <h3>Not Sure About Your Diagnosis or Treatment?</h3>
            <p>Get an expert second opinion from our oncology specialists.</p>
          </div>
          <img className="lead-doc" src="/doc-cutout.webp" alt="" loading="lazy" />
        </div>

        {step === 'form' && (
          <form className="lead-form" onSubmit={sendCode}>
            <label className="lead-field"><span>Full Name<em>*</em></span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" autoComplete="name" />
            </label>
            <label className="lead-field"><span>WhatsApp Number<em>*</em></span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 98765 43210" inputMode="tel" autoComplete="tel" />
            </label>
            {err && <p className="lead-err">{err}</p>}
            <button type="submit" className="btn btn-primary lead-submit" disabled={busy}>{busy ? 'Sending…' : 'Send Verification Code'}</button>
            <p className="lead-note">We’ll send a 6-digit code to your WhatsApp to confirm it’s really you — no spam.</p>
          </form>
        )}

        {step === 'otp' && (
          <form className="lead-form" onSubmit={verify}>
            <p className="lead-otp-lead">Enter the 6-digit code we sent to your WhatsApp on <strong>{phone}</strong>. <button type="button" className="link-btn" onClick={() => { setStep('form'); setErr(''); setCode(''); }}>Change number</button></p>
            <label className="lead-field"><span>Verification Code<em>*</em></span>
              <input className="lead-otp-input" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus />
            </label>
            {devCode && <p className="lead-note">Dev mode: your test code is <strong>{devCode}</strong>.</p>}
            {err && <p className="lead-err">{err}</p>}
            <button type="submit" className="btn btn-primary lead-submit" disabled={busy}>{busy ? 'Verifying…' : 'Verify & Register'}</button>
            <button type="button" className="link-btn lead-resend" onClick={sendCode} disabled={busy}>Resend code</button>
          </form>
        )}

        {step === 'done' && (
          <div className="lead-done">
            <div className="lead-check" aria-hidden="true">✓</div>
            <h4>You’re registered, {name.trim().split(' ')[0] || 'there'}!</h4>
            <p>Your number is verified. Our care team will reach out on WhatsApp shortly to help with your second opinion.</p>
            {uhid && <p className="lead-code">Your reference code: <strong>{uhid}</strong><br /><span>Keep this — we’ll use it to track your reports and records.</span></p>}
            <button type="button" className="btn btn-primary" onClick={close}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
