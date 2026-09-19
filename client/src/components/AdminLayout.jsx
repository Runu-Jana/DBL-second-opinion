import { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';

/* ---------- icons ---------- */
const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
export const AI = {
  dashboard: <svg viewBox="0 0 24 24" {...s}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>,
  users: <svg viewBox="0 0 24 24" {...s}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.2 6-5.2s6 1.9 6 5.2M16 4.2a3.2 3.2 0 0 1 0 6.2M18 20c0-2.6-1-4.3-2.6-5.2" /></svg>,
  patient: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="7" r="3.4" /><path d="M5.5 20c0-3.6 2.9-5.6 6.5-5.6s6.5 2 6.5 5.6" /><path d="M12 10.4v3.9M10 12.3h4" /></svg>,
  staff: <svg viewBox="0 0 24 24" {...s}><path d="M9 3h6v3l2 1v14H7V7l2-1Z" /><path d="M12 11v4M10 13h4" /></svg>,
  appointments: <svg viewBox="0 0 24 24" {...s}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>,
  consult: <svg viewBox="0 0 24 24" {...s}><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1Z" /><path d="M8 9h8M8 12h5" /></svg>,
  reports: <svg viewBox="0 0 24 24" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M9.5 12h5M9.5 15h5" /></svg>,
  plans: <svg viewBox="0 0 24 24" {...s}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>,
  review: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.3 2.3L15.5 9.5" /></svg>,
  pharmacy: <svg viewBox="0 0 24 24" {...s}><rect x="4" y="8" width="16" height="12" rx="2" /><path d="M9 8V6a3 3 0 0 1 6 0v2M12 12v4M10 14h4" /></svg>,
  billing: <svg viewBox="0 0 24 24" {...s}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></svg>,
  lab: <svg viewBox="0 0 24 24" {...s}><path d="M10 3v6l-4.5 8a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 9V3M9 3h6M8 15h8" /></svg>,
  content: <svg viewBox="0 0 24 24" {...s}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v5" /></svg>,
  analytics: <svg viewBox="0 0 24 24" {...s}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
  comms: <svg viewBox="0 0 24 24" {...s}><path d="M3 5h18v11H8l-5 4V5Z" /><path d="M7 9h10M7 12h6" /></svg>,
  settings: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 6.6 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 13.4H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 5 6.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 18 5l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.2Z" /></svg>,
  activity: <svg viewBox="0 0 24 24" {...s}><path d="M3 12h4l2 6 4-14 2 8h6" /></svg>,
  audit: <svg viewBox="0 0 24 24" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><circle cx="11" cy="14" r="2.4" /><path d="m13 16 2 2" /></svg>,
  applications: <svg viewBox="0 0 24 24" {...s}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="m9 13 2 2 4-4" /></svg>,
  logout: <svg viewBox="0 0 24 24" {...s}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" /></svg>,
  headset: <svg viewBox="0 0 24 24" {...s}><path d="M4 13v-1a8 8 0 0 1 16 0v1M4 13a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h1v-5H4M20 13a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-1v-5h1M20 18v1a3 3 0 0 1-3 3h-3" /></svg>,
  search: <svg viewBox="0 0 24 24" {...s}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>,
  bell: <svg viewBox="0 0 24 24" {...s}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 21a2 2 0 0 1-3.4 0" /></svg>,
  mail: <svg viewBox="0 0 24 24" {...s}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>,
  expand: <svg viewBox="0 0 24 24" {...s}><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>,
  globe: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" /></svg>,
  caret: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>,
  menu: <svg viewBox="0 0 24 24" {...s}><path d="M4 6h16M4 12h16M4 18h16" /></svg>,
};

const BrandMark = () => (
  <span className="adm-brand-mark" aria-hidden="true">
    <svg viewBox="5 2 22 28" width="34" height="42">
      <path d="M16 3 26.5 6.2V13.8C26.5 21.2 21.9 26.2 16 29 10.1 26.2 5.5 21.2 5.5 13.8V6.2Z" fill="#12b3a0" />
      <path d="M16 5.6 24 8V13.8C24 19.6 20.2 23.7 16 26.2 11.8 23.7 8 19.6 8 13.8V8Z" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="1" />
      <rect x="14.3" y="9.6" width="3.4" height="11" rx="1" fill="#fff" />
      <rect x="10.5" y="13.4" width="11" height="3.4" rx="1" fill="#fff" />
    </svg>
  </span>
);

/* nav sections in display order — matches the admin reference */
// Nav key -> the queue count that belongs on it (see /api/notifications).
const NAV_QUEUE = { consultations: 'consultations', applications: 'applications', reports: 'reports' };

export const ADMIN_NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: AI.dashboard },
  { key: 'users', label: 'User Management', icon: AI.users },
  { key: 'patients', label: 'Patient Management', icon: AI.patient },
  { key: 'staff', label: 'Doctor & Staff Management', icon: AI.staff },
  { key: 'applications', label: 'Doctor Applications', icon: AI.applications },
  { key: 'appointments', label: 'Appointments', icon: AI.appointments },
  { key: 'consultations', label: 'Consultations', icon: AI.consult },
  { key: 'reports', label: 'Reports Management', icon: AI.reports },
  { key: 'treatment', label: 'Treatment Plans', icon: AI.plans },
  { key: 'second-opinion', label: 'Review & Second Opinion', icon: AI.review },
  { key: 'pharmacy', label: 'Pharmacy & Medications', icon: AI.pharmacy },
  { key: 'billing', label: 'Billing & Payments', icon: AI.billing },
  { key: 'lab', label: 'Lab & Investigations', icon: AI.lab },
  { key: 'content', label: 'Content Management', icon: AI.content },
  { key: 'analytics', label: 'AI & Analytics', icon: AI.analytics },
  { key: 'communication', label: 'Patient Messages', icon: AI.comms },
  { key: 'settings', label: 'Settings', icon: AI.settings },
  { key: 'system-activity', label: 'System Activity', icon: AI.activity },
  { key: 'audit', label: 'Audit Logs', icon: AI.audit },
];

export default function AdminLayout({ section, onNavigate, adminName, onLogout, children }) {
  const [open, setOpen] = useState(false); // mobile sidebar
  // When this admin last opened each panel. Kept per browser rather than on the server, so one
  // admin clearing their badge does not clear everyone else's.
  const seenKey = (k) => `dbl_admin_seen_${k}`;
  const seen = (k) => localStorage.getItem(seenKey(k)) || '';
  const [counts, setCounts] = useState({ activity: 0, messages: 0 });
  const [queues, setQueues] = useState({});

  const refresh = useCallback(() => {
    const q = new URLSearchParams({ activitySince: seen('activity'), messagesSince: seen('messages') });
    api('/notifications?' + q.toString())
      .then((d) => { setCounts({ activity: d.activity || 0, messages: d.messages || 0 }); setQueues(d.queues || {}); })
      .catch(() => {});   // a badge is not worth surfacing an error for
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60000);
    return () => clearInterval(t);
  }, [refresh]);

  // Opening a panel is what "I have seen this" means, so the badge clears here.
  const openPanel = (key, which) => {
    localStorage.setItem(seenKey(which), new Date().toISOString());
    setCounts((c) => ({ ...c, [which]: 0 }));
    go(key);
  };

  const go = (key) => { onNavigate(key); setOpen(false); };
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.();
  };
  const initials = (adminName || 'Admin User').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className={'adm-shell' + (open ? ' nav-open' : '')}>
      <aside className="adm-side" aria-label="Admin navigation">
        <div className="adm-side-brand">
          <BrandMark />
          <span className="adm-brand-text">
            <span className="adm-brand-name">DBL</span>
            <span className="adm-brand-sub">INTERNATIONAL</span>
          </span>
        </div>

        <nav className="adm-nav">
          {ADMIN_NAV.map((it) => (
            <button
              key={it.key}
              type="button"
              className={'adm-nav-item' + (it.key === section ? ' active' : '')}
              onClick={() => go(it.key)}
            >
              <span className="adm-nav-ico">{it.icon}</span>
              <span className="adm-nav-label">{it.label}</span>
              {queues[NAV_QUEUE[it.key]] > 0 ? <span className="adm-nav-badge">{queues[NAV_QUEUE[it.key]] > 99 ? '99+' : queues[NAV_QUEUE[it.key]]}</span> : null}
            </button>
          ))}
        </nav>

        <div className="adm-side-help">
          <span className="adm-help-ico">{AI.headset}</span>
          <div>
            <strong>Support &amp; Help</strong>
            <p>24x7 Technical Support</p>
            <p className="adm-help-num">+918059525000</p>
            <p className="adm-help-mail">support@dblhealthcare.com</p>
          </div>
        </div>
      </aside>

      {open && <div className="adm-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className="adm-main">
        <header className="adm-topbar">
          <button type="button" className="adm-icon-btn adm-burger" aria-label="Toggle menu" onClick={() => setOpen((v) => !v)}>{AI.menu}</button>
          <div className="adm-search">
            <span className="adm-search-ico">{AI.search}</span>
            <input type="search" placeholder="Search patient, doctor, appointment, report…" aria-label="Search" />
          </div>
          <div className="adm-top-actions">
            <button type="button" className={'adm-icon-btn' + (counts.activity ? ' has-dot' : '')} aria-label={`Notifications${counts.activity ? ` (${counts.activity} new)` : ''}`} title="System activity" onClick={() => openPanel('system-activity', 'activity')}>{AI.bell}{counts.activity > 0 && <span className="adm-dot">{counts.activity > 99 ? '99+' : counts.activity}</span>}</button>
            <button type="button" className={'adm-icon-btn' + (counts.messages ? ' has-dot' : '')} aria-label={`Messages${counts.messages ? ` (${counts.messages} new)` : ''}`} title="Communication" onClick={() => openPanel('communication', 'messages')}>{AI.mail}{counts.messages > 0 && <span className="adm-dot amber">{counts.messages > 99 ? '99+' : counts.messages}</span>}</button>
            <button type="button" className="adm-icon-btn hide-sm" aria-label="Fullscreen" title="Toggle fullscreen" onClick={toggleFullscreen}>{AI.expand}</button>
            <button type="button" className="adm-lang hide-sm">{AI.globe}<span>English</span>{AI.caret}</button>
            <div className="adm-user">
              <span className="adm-user-avatar">{initials}</span>
              <span className="adm-user-meta">
                <strong>{adminName || 'Admin User'}</strong>
                <span>Super Administrator</span>
              </span>
              <button type="button" className="adm-user-caret" onClick={onLogout} title="Log out" aria-label="Log out">{AI.logout}</button>
            </div>
          </div>
        </header>

        <main className="adm-content">{children}</main>

        <footer className="adm-footer">
          <span>© 2024 DBL International. All rights reserved.</span>
          <span className="adm-footer-links">
            <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Terms &amp; Conditions</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Disclaimer</a>
          </span>
          <span className="adm-version">Version 2.4.0</span>
        </footer>
      </div>
    </div>
  );
}
