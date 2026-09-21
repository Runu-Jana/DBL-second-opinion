import { useEffect, useRef, useState } from 'react';
import { api, patientApi, setPatientToken } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

/* Scroll-triggered "second opinion" registration pop-up. Appears once per session after the
   visitor scrolls ~40% down. Captures name + phone + email, verifies one of them with a code,
   and only then registers the customer (creates a Patient with a unique code).

   Which contact detail gets the code is a server setting, so /contact/otp/channel is asked on
   open: the server can be switched from email to WhatsApp or SMS without redeploying this. */
export default function LeadPopup() {
  const { finishLogin, setUploadOpen, session, loading } = useAuth();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState('form'); // form -> otp -> done
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [uhid, setUhid] = useState('');
  const [regEmail, setRegEmail] = useState('');   // the address on the record we just verified
  const [pw, setPw] = useState('');
  const [pwSaved, setPwSaved] = useState(false);
  const pending = useRef(null);   // the session earned by verifying, adopted when they leave
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [devCode, setDevCode] = useState('');
  const [channel, setChannel] = useState('email');   // which channel the server will send over

  // Never for someone already signed in: they have an account, and a "register" pop-up reads
  // as having to do it all again. The stored session restores asynchronously, so wait for it.
  useEffect(() => {
    if (loading || session) return;
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
  }, [loading, session]);

  useEffect(() => {
    if (!show) return;
    api('/contact/otp/channel', { auth: false }).then((r) => r?.channel && setChannel(r.channel)).catch(() => {});
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [show]);

  // Leaving the pop-up, by any route, is when the session it earned takes effect. Adopting it
  // earlier would have the home page send them to their dashboard mid-pop-up, taking the
  // reference code and the password offer with it.
  const close = () => {
    setShow(false);
    const p = pending.current;
    if (p) { pending.current = null; finishLogin(p.token, p.patient); }
  };

  const needsEmail = channel === 'email';

  const sendCode = async (e) => {
    e?.preventDefault();
    if (!name.trim() || !phone.trim()) { setErr('Please enter your name and phone number.'); return; }
    if (needsEmail && !email.trim()) { setErr('Please enter your email address — that is where the code goes.'); return; }
    setErr(''); setBusy(true);
    try {
      const r = await api('/contact/otp/send', { method: 'POST', auth: false, body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim() }) });
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
      setRegEmail(r.patient?.email || '');
      // Store the token now, so closing the tab still leaves them signed in next time, but keep
      // it out of the app until they leave the pop-up (see close).
      if (r.token && r.patient) { setPatientToken(r.token); pending.current = { token: r.token, patient: r.patient }; }
      setStep('done');
    } catch (ex) { setErr(ex.message || 'Could not verify the code. Please try again.'); }
    finally { setBusy(false); }
  };

  // Optional, offered right after registering: without it the only way back in from another
  // device is the reset email, which most people only discover once they are locked out.
  const savePassword = async (e) => {
    e?.preventDefault();
    if (pw.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    setErr(''); setBusy(true);
    try {
      await patientApi('/portal/password', { method: 'PUT', body: JSON.stringify({ password: pw }) });
      setPwSaved(true); setPw('');
    } catch (ex) { setErr(ex.message || 'Could not save your password. Please try again.'); }
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
            <label className="lead-field"><span>Phone Number<em>*</em></span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 98765 43210" inputMode="tel" autoComplete="tel" />
            </label>
            {needsEmail && (
              <label className="lead-field"><span>Email Address<em>*</em></span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" inputMode="email" autoComplete="email" />
              </label>
            )}
            {err && <p className="lead-err">{err}</p>}
            <button type="submit" className="btn btn-primary lead-submit" disabled={busy}>{busy ? 'Sending…' : 'Send Verification Code'}</button>
            <p className="lead-note">We’ll send a 6-digit code to your {needsEmail ? 'email' : 'WhatsApp'} — no spam.</p>
          </form>
        )}

        {step === 'otp' && (
          <form className="lead-form" onSubmit={verify}>
            <p className="lead-otp-lead">Enter the 6-digit code we sent to <strong>{needsEmail ? email : phone}</strong>. <button type="button" className="link-btn" onClick={() => { setStep('form'); setErr(''); setCode(''); }}>Change {needsEmail ? 'address' : 'number'}</button></p>
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
            <p>Your {needsEmail ? 'email is' : 'number is'} verified. Our care team will be in touch shortly to help with your second opinion.</p>
            {uhid && <p className="lead-code">Your reference code: <strong>{uhid}</strong><br /><span>Keep this — we’ll use it to track your reports and records.</span></p>}
            {regEmail && !pwSaved && (
              <form className="lead-pw" onSubmit={savePassword}>
                <p>Set a password so you can sign in with <strong>{regEmail}</strong> from any device. Optional — you are already signed in here.</p>
                <label className="lead-field"><span>Password</span>
                  <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" />
                </label>
                {err && <p className="lead-err">{err}</p>}
                <button type="submit" className="btn btn-outline lead-submit" disabled={busy || !pw}>{busy ? 'Saving…' : 'Save password'}</button>
              </form>
            )}
            {pwSaved && <p className="lead-pw-ok">Password saved. You can now sign in with {regEmail} from any device.</p>}
            <button type="button" className="btn btn-primary" onClick={() => { close(); setUploadOpen(true); }}>Upload my reports</button>
            <button type="button" className="link-btn lead-later" onClick={close}>I’ll do this later</button>
          </div>
        )}
      </div>
    </div>
  );
}
