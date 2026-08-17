import { useState } from 'react';

const EyeIco = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" /><circle cx="12" cy="12" r="3" /></svg>
);
const EyeOffIco = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><path d="M1 1l22 22" /></svg>
);

// Password input with a show/hide eye toggle. Stays uncontrolled (form reads it by `name`).
export default function PasswordField({ label, name, autoComplete, placeholder }) {
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
