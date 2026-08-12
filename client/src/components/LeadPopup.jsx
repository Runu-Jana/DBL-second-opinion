import { useEffect, useState } from 'react';
import { api } from '../api.js';

/* Scroll-triggered "second opinion" lead pop-up. Appears once per session after the visitor
   scrolls ~40% down the page. Captures name + phone -> /api/contact/lead. */
export default function LeadPopup() {
  const [show, setShow] = useState(false);
  const [sent, setSent] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

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
  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) { setErr('Please enter your name and phone number.'); return; }
    setErr(''); setBusy(true);
    try {
      await api('/contact/lead', { method: 'POST', auth: false, body: JSON.stringify({ name: name.trim(), phone: phone.trim() }) });
      setSent(true);
    } catch (ex) { setErr(ex.message || 'Something went wrong. Please try again.'); }
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
          <img className="lead-doc" src="/hero-mobile.jpg" alt="" loading="lazy" />
        </div>

        {sent ? (
          <div className="lead-done">
            <div className="lead-check" aria-hidden="true">✓</div>
            <h4>Thank you, {name.trim().split(' ')[0] || 'there'}!</h4>
            <p>Our care team will call you shortly to help with your second opinion.</p>
            <button type="button" className="btn btn-primary" onClick={close}>Close</button>
          </div>
        ) : (
          <form className="lead-form" onSubmit={submit}>
            <label className="lead-field"><span>Full Name<em>*</em></span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" autoComplete="name" />
            </label>
            <label className="lead-field"><span>Phone Number<em>*</em></span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" inputMode="tel" autoComplete="tel" />
            </label>
            {err && <p className="lead-err">{err}</p>}
            <button type="submit" className="btn btn-primary lead-submit" disabled={busy}>{busy ? 'Sending…' : 'Get My Second Opinion'}</button>
            <p className="lead-note">We respect your privacy — no spam, just expert guidance.</p>
          </form>
        )}
      </div>
    </div>
  );
}
