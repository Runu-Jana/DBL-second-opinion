import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, validEmail } from '../context/AuthContext.jsx';

const EyeIco = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" /><circle cx="12" cy="12" r="3" /></svg>
);
const EyeOffIco = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><path d="M1 1l22 22" /></svg>
);

// Password input with a show/hide eye toggle. Stays uncontrolled (form reads it by `name`).
function PasswordField({ label, name, autoComplete, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <label>{label}
      <span className="pw-wrap">
        <input type={show ? 'text' : 'password'} name={name} autoComplete={autoComplete} placeholder={placeholder} required />
        <button type="button" className="pw-toggle" onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} tabIndex={-1}>
          {show ? <EyeOffIco /> : <EyeIco />}
        </button>
      </span>
    </label>
  );
}

export default function AuthModal() {
  const { authOpen, setAuthOpen, login, signup, forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');   // login | signup | forgot
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);   // forgot: reset email dispatched
  const [devUrl, setDevUrl] = useState('');
  const [prefillEmail, setPrefillEmail] = useState('');

  useEffect(() => { if (authOpen) { setTab('login'); setErr(''); setSent(false); setDevUrl(''); setPrefillEmail(''); } }, [authOpen]);
  useEffect(() => {
    if (!authOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setAuthOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [authOpen, setAuthOpen]);

  if (!authOpen) return null;

  const onLogin = async (e) => {
    e.preventDefault();
    const f = e.target;
    const email = f.email.value.trim(), password = f.password.value;
    if (!validEmail(email)) return setErr('Please enter a valid email address.');
    if (!password) return setErr('Please enter your password.');
    setErr(''); setBusy(true);
    try { await login({ email, password }); navigate('/dashboard'); } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };
  const onSignup = async (e) => {
    e.preventDefault();
    const f = e.target;
    const name = f.name.value.trim(), email = f.email.value.trim(), password = f.password.value, confirm = f.confirm.value;
    if (!name) return setErr('Please enter your name.');
    if (!validEmail(email)) return setErr('Please enter a valid email address.');
    if (password.length < 6) return setErr('Password must be at least 6 characters.');
    if (password !== confirm) return setErr('Passwords do not match.');
    setErr(''); setBusy(true);
    try { await signup({ name, email, password }); navigate('/dashboard'); } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };
  const goForgot = (email = '') => { setPrefillEmail(email || ''); setTab('forgot'); setErr(''); setSent(false); setDevUrl(''); };
  const onForgot = async (e) => {
    e.preventDefault();
    const email = e.target.email.value.trim();
    if (!validEmail(email)) return setErr('Please enter a valid email address.');
    setErr(''); setBusy(true);
    try { const r = await forgotPassword({ email }); setSent(true); setDevUrl(r?.devResetUrl || ''); }
    catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setAuthOpen(false); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="Close">&times;</button>
        <div className="modal-head">
          <span className="modal-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="30" height="32"><path d="M16 3 26.5 6.2V13.8C26.5 21.2 21.9 26.2 16 29 10.1 26.2 5.5 21.2 5.5 13.8V6.2Z" fill="currentColor" /><path d="M16 5.6 24 8V13.8C24 19.6 20.2 23.7 16 26.2 11.8 23.7 8 19.6 8 13.8V8Z" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="1" /><rect x="14.3" y="9.6" width="3.4" height="11" rx="1" fill="#fff" /><rect x="10.5" y="13.4" width="11" height="3.4" rx="1" fill="#fff" /></svg>
          </span>
          <h3>Patient Portal Access</h3>
          <p className="modal-sub">Sign in to securely share your medical reports with our oncology team. Your privacy comes first.</p>
          
        </div>

        <div className="auth-tabs" role="tablist">
          <button className={'auth-tab' + (tab === 'login' ? ' active' : '')} onClick={() => { setTab('login'); setErr(''); }}>Login</button>
          <button className={'auth-tab' + (tab === 'signup' ? ' active' : '')} onClick={() => { setTab('signup'); setErr(''); }}>Create Account</button>
        </div>

        {tab === 'forgot' ? (
          <form className="auth-form" onSubmit={onForgot} noValidate>
            {sent ? (
              <>
                <p className="auth-forgot-lead">If an account exists for that email, we’ve sent a link to reset your password. Check your inbox (and spam folder).</p>
                {devUrl && <p className="form-hint">Dev mode: <a href={devUrl}>open the reset link</a></p>}
                <button type="button" className="btn btn-primary btn-block" onClick={() => { setTab('login'); setErr(''); }}>Back to login</button>
              </>
            ) : (
              <>
                <p className="auth-forgot-lead">Enter your account email and we’ll send you a link to reset your password.</p>
                <label>Email address<input type="email" name="email" defaultValue={prefillEmail} autoComplete="email" placeholder="you@example.com" required autoFocus /></label>
                {err && <p className="form-error">{err}</p>}
                <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
                <p className="form-hint auth-center"><button type="button" className="link-btn" onClick={() => { setTab('login'); setErr(''); }}>← Back to login</button></p>
              </>
            )}
          </form>
        ) : tab === 'login' ? (
          <form className="auth-form" onSubmit={onLogin} noValidate>
            <label>Email address<input type="email" name="email" autoComplete="email" placeholder="you@example.com" required /></label>
            <PasswordField label="Password" name="password" autoComplete="current-password" placeholder="Your password" />
            <p className="auth-forgot-row"><button type="button" className="link-btn" onClick={(e) => goForgot(e.currentTarget.closest('form')?.email?.value?.trim())}>Forgot password?</button></p>
            {err && (
              <div className="form-error-block">
                <p className="form-error">{err}</p>
                <p className="form-hint">New to DBL International? <button type="button" className="link-btn" onClick={() => { setTab('signup'); setErr(''); }}>Create an account</button></p>
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Login & Continue'}</button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={onSignup} noValidate>
            <label>Full name<input type="text" name="name" autoComplete="name" placeholder="Your name" required /></label>
            <label>Email address<input type="email" name="email" autoComplete="email" placeholder="you@example.com" required /></label>
            <PasswordField label="Create password" name="password" autoComplete="new-password" placeholder="At least 6 characters" />
            <PasswordField label="Confirm password" name="confirm" autoComplete="new-password" placeholder="Re-enter password" />
            {err && (
              <div className="form-error-block">
                <p className="form-error">{err}</p>
                {/already exists/i.test(err) && (
                  <p className="form-hint">
                    <button type="button" className="link-btn" onClick={() => { setTab('login'); setErr(''); }}>Log in</button>{' '}or{' '}
                    <button type="button" className="link-btn" onClick={(e) => goForgot(e.currentTarget.closest('form')?.email?.value?.trim())}>reset your password</button>
                  </p>
                )}
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating…' : 'Create Account & Continue'}</button>
          </form>
        )}

        <p className="modal-privacy">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
          Your information is encrypted and kept strictly confidential.
        </p>
      </div>
    </div>
  );
}
