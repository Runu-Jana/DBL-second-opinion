import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// Landing page for the password-reset email link (/reset-password?token=...).
export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return setErr('Password must be at least 6 characters.');
    if (password !== confirm) return setErr('Passwords do not match.');
    setErr(''); setBusy(true);
    try { await resetPassword({ token, password }); navigate('/dashboard'); }
    catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <Header />
      <main className="reset-page">
        <div className="reset-card">
          <h1>Reset your password</h1>
          {!token ? (
            <p className="form-error">This reset link is missing or invalid. <Link to="/">Go home</Link> and request a new one.</p>
          ) : (
            <form className="auth-form" onSubmit={submit} noValidate>
              <label>New password<input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" required /></label>
              <label>Confirm password<input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" autoComplete="new-password" required /></label>
              <label className="reset-show"><input type="checkbox" checked={show} onChange={() => setShow((s) => !s)} /> Show password</label>
              {err && <p className="form-error">{err}</p>}
              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Saving…' : 'Set new password'}</button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
