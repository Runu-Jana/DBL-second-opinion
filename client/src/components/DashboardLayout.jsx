import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from './Header.jsx';
import { useAuth } from '../context/AuthContext.jsx';

/* ---------- sidebar icons ---------- */
const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const I = {
  dashboard: <svg viewBox="0 0 24 24" {...s}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>,
  cases: <svg viewBox="0 0 24 24" {...s}><path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /></svg>,
  upload: <svg viewBox="0 0 24 24" {...s}><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3M12 4v11M8 8l4-4 4 4" /></svg>,
  appointments: <svg viewBox="0 0 24 24" {...s}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>,
  notifications: <svg viewBox="0 0 24 24" {...s}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 21a2 2 0 0 1-3.4 0" /></svg>,
  documents: <svg viewBox="0 0 24 24" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M9.5 13h5M9.5 16h5" /></svg>,
  messages: <svg viewBox="0 0 24 24" {...s}><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1Z" /></svg>,
  payments: <svg viewBox="0 0 24 24" {...s}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></svg>,
  profile: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" /></svg>,
  help: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1 .9-1 1.7M12 17h.01" /></svg>,
  logout: <svg viewBox="0 0 24 24" {...s}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" /></svg>,
};

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: I.dashboard, to: '/dashboard' },
  { key: 'cases', label: 'My Cases', icon: I.cases, to: '/dashboard/cases' },
  { key: 'upload', label: 'Upload Reports', icon: I.upload, to: '/dashboard/upload' },
  { key: 'appointments', label: 'My Appointments', icon: I.appointments, to: '/dashboard/appointments' },
  { key: 'notifications', label: 'Notifications', icon: I.notifications, badge: 3, to: '/dashboard/notifications' },
  { key: 'documents', label: 'My Documents', icon: I.documents, to: '/dashboard/documents' },
  { key: 'messages', label: 'Messages', icon: I.messages, to: '/dashboard/messages' },
  { key: 'payments', label: 'Payments', icon: I.payments, to: '/dashboard/payments' },
  { key: 'profile', label: 'My Profile', icon: I.profile, to: '/dashboard/profile' },
  { key: 'help', label: 'Help Center', icon: I.help, to: '/dashboard/help' },
];

export default function DashboardLayout({ active = 'dashboard', children }) {
  const { session, logout, setAuthOpen } = useAuth();
  const navigate = useNavigate();
  const doLogout = () => { logout(); navigate('/'); };

  useEffect(() => {
    if (!session) { setAuthOpen(true); navigate('/'); }
  }, [session, setAuthOpen, navigate]);
  if (!session) return null;

  return (
    <>
      <Header active="dashboard" />
      <div className="dash-body">
        <aside className="dash-side" aria-label="Patient portal">
          <nav className="dash-nav">
            {NAV.map((it) => (
              <Link key={it.key} to={it.to} className={'dash-nav-item' + (it.key === active ? ' active' : '')}>
                <span className="dash-nav-ico">{it.icon}</span>
                <span className="dash-nav-label">{it.label}</span>
                {it.badge ? <span className="dash-nav-badge">{it.badge}</span> : null}
              </Link>
            ))}
          </nav>
          <button type="button" className="dash-nav-item logout" onClick={doLogout}>
            <span className="dash-nav-ico">{I.logout}</span>
            <span className="dash-nav-label">Logout</span>
          </button>
        </aside>
        <main className="dash-content">{children}</main>
      </div>
    </>
  );
}
