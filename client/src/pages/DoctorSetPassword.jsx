import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { setDoctorToken } from '../api.js';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';


// Landing page for the doctor's one-time link (/doctor/set-password?token=...).
// Serves both first-time activation and forgot-password — the backend tells them apart
// by the token's purpose. On success the doctor is signed straight into their portal.
export default function DoctorSetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return setErr('Password must be at least 8 characters.');
    if (password !== confirm) return setErr('Passwords do not match.');
    setErr(''); setBusy(true);
    try {
      const res = await fetch('/api/auth/doctor-set-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not set your password.');
      setDoctorToken(data.token);   // signed in — the portal reads this on mount
      navigate('/doctor');
    } catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <Header />
      <main className="reset-page">
        <div className="reset-card">
          <h1>Set your password</h1>
          {!token ? (
            <p className="form-error">This link is missing or invalid. Please ask the DBL team to send you a new one.</p>
          ) : (
            <form className="auth-form" onSubmit={submit} noValidate>
              <p style={{ margin: '0 0 1rem', fontSize: '.88rem', color: 'var(--muted)' }}>
                Choose a password for your DBL staff account. You'll sign in with your email address and this password.
              </p>
              <label>Password<input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" required autoFocus /></label>
              <label>Confirm password<input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" autoComplete="new-password" required /></label>
              <label className="reset-show"><input type="checkbox" checked={show} onChange={() => setShow((s) => !s)} /> Show password</label>
              {err && <p className="form-error">{err}</p>}
              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Saving…' : 'Set password & sign in'}</button>
              <p style={{ margin: '.9rem 0 0', fontSize: '.82rem', color: 'var(--muted)', textAlign: 'center' }}>
                Already set it? <Link to="/doctor">Go to the staff login</Link>
              </p>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
