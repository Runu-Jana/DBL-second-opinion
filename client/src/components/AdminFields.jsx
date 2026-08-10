import { useState, useEffect, useRef } from 'react';

/* ---------- Refresh button (re-fetches the current section) ---------- */
export function RefreshButton({ onClick, title = 'Refresh', label = 'Refresh' }) {
  const [spin, setSpin] = useState(false);
  const handle = () => {
    setSpin(true);
    try { onClick && onClick(); } finally { setTimeout(() => setSpin(false), 650); }
  };
  return (
    <button type="button" className={'adm-refresh' + (spin ? ' is-spinning' : '')} onClick={handle} title={title} aria-label={title}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" />
      </svg>
      {label && <span>{label}</span>}
    </button>
  );
}

/* ---------- Styled dropdown (replaces native <select>) ---------- */
export function Select({ value, onChange, options, placeholder = 'Select…' }) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const current = opts.find((o) => String(o.value) === String(value));
  return (
    <div className={'adm-select' + (open ? ' open' : '')} ref={ref}>
      <button type="button" className="adm-select-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className={current ? '' : 'ph'}>{current ? current.label : placeholder}</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="adm-select-menu" role="listbox">
          {opts.map((o) => (
            <button type="button" key={o.value} role="option" aria-selected={String(o.value) === String(value)}
              className={'adm-select-opt' + (String(o.value) === String(value) ? ' sel' : '')}
              onClick={() => { onChange(o.value); setOpen(false); }}>
              <span>{o.label}</span>
              {String(o.value) === String(value) && <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4 10-10" /></svg>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Date picker (calendar) ---------- */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
export const fmtDate = (d) => `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()].slice(0, 3)}, ${d.getFullYear()}`;

export function DateField({ value, onChange, placeholder = 'Pick a date' }) {
  const parsed = value ? new Date(value) : null;
  const valid = parsed && !isNaN(parsed.getTime());
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(valid ? new Date(parsed.getFullYear(), parsed.getMonth(), 1) : new Date());
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (valid) setView(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const y = view.getFullYear(), m = view.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const today = new Date();
  const isSel = (d) => valid && parsed.getFullYear() === y && parsed.getMonth() === m && parsed.getDate() === d;
  const isToday = (d) => today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
  const step = (delta) => setView(new Date(y, m + delta, 1));
  const pick = (d) => { onChange(fmtDate(new Date(y, m, d))); setOpen(false); };

  return (
    <div className={'adm-date' + (open ? ' open' : '')} ref={ref}>
      <button type="button" className="adm-date-btn" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className={valid ? '' : 'ph'}>{valid ? fmtDate(parsed) : (value || placeholder)}</span>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>
      </button>
      {open && (
        <div className="adm-cal" role="dialog" aria-label="Choose date">
          <div className="adm-cal-head">
            <button type="button" className="adm-cal-nav" onClick={() => step(-1)} aria-label="Previous month"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg></button>
            <strong>{MONTHS[m]} {y}</strong>
            <button type="button" className="adm-cal-nav" onClick={() => step(1)} aria-label="Next month"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg></button>
          </div>
          <div className="adm-cal-grid adm-cal-dow">{WEEKDAYS.map((w) => <span key={w}>{w}</span>)}</div>
          <div className="adm-cal-grid">
            {cells.map((d, i) => d === null
              ? <span key={'e' + i} className="adm-cal-empty" />
              : <button type="button" key={d} className={'adm-cal-day' + (isSel(d) ? ' sel' : '') + (isToday(d) && !isSel(d) ? ' today' : '')} onClick={() => pick(d)}>{d}</button>)}
          </div>
          <div className="adm-cal-foot">
            <button type="button" className="adm-cal-today" onClick={() => { const t = new Date(); onChange(fmtDate(t)); setOpen(false); }}>Today</button>
          </div>
        </div>
      )}
    </div>
  );
}
