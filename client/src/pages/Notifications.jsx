// The patient's notification feed.
//
// This page used to render four hardcoded examples, so it said the same thing to everyone and
// never changed. It now shows what actually happened to this patient's case: reports received,
// a specialist assigned, review started, the opinion delivered, messages.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { patientApi } from '../api.js';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Ico = {
  report: <svg viewBox="0 0 24 24" width="20" height="20" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M9.5 12h5M9.5 15h5" /></svg>,
  message: <svg viewBox="0 0 24 24" width="20" height="20" {...s}><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1Z" /></svg>,
  appointment: <svg viewBox="0 0 24 24" width="20" height="20" {...s}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>,
  case: <svg viewBox="0 0 24 24" width="20" height="20" {...s}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.3 2.3L15.5 9.5" /></svg>,
  account: <svg viewBox="0 0 24 24" width="20" height="20" {...s}><circle cx="12" cy="8" r="3.6" /><path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" /></svg>,
};

// Relative for anything recent, an actual date once it stops being "the other day".
function ago(iso) {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Notifications() {
  const [items, setItems] = useState(null);   // null = loading
  const [err, setErr] = useState('');
  const navigate = useNavigate();
  const { refreshUnread } = useAuth();

  const load = () => patientApi('/notifications/mine')
    .then((d) => setItems(d.items || []))
    .catch((e) => { setErr(e.message); setItems([]); });
  useEffect(() => { load(); }, []);

  const unread = (items || []).filter((n) => !n.readAt).length;

  // After marking read, refresh the shared count so the bell and the sidebar badge clear too —
  // not just this page.
  const markAll = () => patientApi('/notifications/mine/read', { method: 'POST', body: JSON.stringify({}) })
    .then(() => { load(); refreshUnread(); }).catch((e) => setErr(e.message));

  // Reading one is what opening it means; follow its link afterwards if it has one.
  const open = (n) => {
    if (!n.readAt) {
      patientApi('/notifications/mine/read', { method: 'POST', body: JSON.stringify({ id: n.id }) })
        .then(() => { load(); refreshUnread(); }).catch(() => {});
    }
    if (n.link) navigate(n.link);
  };

  return (
    <DashboardLayout active="notifications">
      <div className="pg-head">
        <div>
          <h1>Notifications</h1>
          <p>
            {items === null ? 'Loading…'
              : unread ? `You have ${unread} unread notification${unread > 1 ? 's' : ''}.`
                : 'You are all caught up.'}
          </p>
        </div>
        {unread > 0 && (
          <button type="button" className="btn btn-outline pg-action" onClick={markAll}>Mark all as read</button>
        )}
      </div>

      {err && <p className="chat-err">{err}</p>}

      {items === null ? (
        <div className="dash-card empty"><p>Loading your notifications…</p></div>
      ) : items.length === 0 ? (
        <div className="dash-card empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /></svg>
          <p>Nothing yet. We will tell you here as your case moves forward.</p>
        </div>
      ) : (
        <div className="dash-card notif-list">
          {items.map((n) => (
            <button
              type="button"
              key={n.id}
              className={'notif' + (n.readAt ? '' : ' unread') + (n.link ? ' clickable' : '')}
              onClick={() => open(n)}
            >
              <span className="notif-ico">{Ico[n.kind] || Ico.case}</span>
              <span className="notif-body">
                <strong>{n.title}</strong>
                {n.body && <span>{n.body}</span>}
              </span>
              <span className="notif-time">{ago(n.createdAt)}</span>
            </button>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
