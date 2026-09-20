// Notification bell for the staff portals (doctor and counsellor).
//
// Both desks run on the same shell and read the same feed, so this is one component rather than
// two near-identical ones. The count is what is unread, not what is new since you last looked:
// on these desks a notification is a piece of work, and it should keep showing until it has
// actually been opened.
import { useCallback, useEffect, useRef, useState } from 'react';

const Bell = (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);

function ago(iso) {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function StaffBell({ api }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const wrap = useRef(null);

  const load = useCallback(() => {
    api('/notifications/mine')
      .then((d) => { setItems(d.items || []); setUnread(d.unread || 0); })
      .catch(() => {});   // a bell is not worth interrupting the page for
  }, [api]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  // Clicking anywhere else closes it, as a dropdown should.
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const markOne = (n) => {
    if (n.readAt) return;
    api('/notifications/mine/read', { method: 'POST', body: JSON.stringify({ id: n.id }) })
      .then(load).catch(() => {});
  };
  const markAll = () => api('/notifications/mine/read', { method: 'POST', body: JSON.stringify({}) })
    .then(load).catch(() => {});

  return (
    <div className="staff-bell" ref={wrap}>
      <button
        type="button"
        className="staff-bell-btn"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {Bell}
        {unread > 0 && <span className="staff-bell-dot">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <div className="staff-bell-panel" role="dialog" aria-label="Notifications">
          <div className="staff-bell-head">
            <strong>Notifications</strong>
            {unread > 0 && <button type="button" className="link-btn" onClick={markAll}>Mark all read</button>}
          </div>
          <div className="staff-bell-list">
            {items.length === 0 && <p className="staff-bell-empty">Nothing yet.</p>}
            {items.map((n) => (
              <button
                type="button"
                key={n.id}
                className={'staff-bell-item' + (n.readAt ? '' : ' unread')}
                onClick={() => markOne(n)}
              >
                <span className="staff-bell-item-top">
                  <strong>{n.title}</strong>
                  <em>{ago(n.createdAt)}</em>
                </span>
                {n.body && <span className="staff-bell-item-body">{n.body}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
