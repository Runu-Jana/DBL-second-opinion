import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Ico = {
  report: <svg viewBox="0 0 24 24" width="20" height="20" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M9.5 12h5M9.5 15h5" /></svg>,
  msg: <svg viewBox="0 0 24 24" width="20" height="20" {...s}><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1Z" /></svg>,
  appt: <svg viewBox="0 0 24 24" width="20" height="20" {...s}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>,
};
const SEED = [
  { icon: Ico.report, title: 'Expert opinion ready', text: 'Your report for case DBL-2025-002 is ready to view.', time: '2h ago', unread: true },
  { icon: Ico.msg, title: 'New message from Care Coordinator', text: 'Your report has been reviewed by our experts.', time: '1d ago', unread: true },
  { icon: Ico.appt, title: 'Appointment confirmed', text: 'Video consultation with Dr. Priya Sharma on 15 May, 10:30 AM.', time: '2d ago', unread: true },
  { icon: Ico.report, title: 'Reports received', text: '3 reports for case DBL-2025-001 were received securely.', time: '4d ago', unread: false },
];

export default function Notifications() {
  const [items, setItems] = useState(SEED);
  const unread = items.filter((i) => i.unread).length;

  return (
    <DashboardLayout active="notifications">
      <div className="pg-head">
        <div>
          <h1>Notifications</h1>
          <p>{unread ? `You have ${unread} unread notification${unread > 1 ? 's' : ''}.` : 'You are all caught up.'}</p>
        </div>
        {unread > 0 && (
          <button type="button" className="btn btn-outline pg-action" onClick={() => setItems((l) => l.map((i) => ({ ...i, unread: false })))}>
            Mark all as read
          </button>
        )}
      </div>

      <section className="dash-card" style={{ padding: '.4rem 1.2rem' }}>
        <div className="list">
          {items.map((n, i) => (
            <div className={'list-row' + (n.unread ? ' unread' : '')} key={i} style={{ paddingLeft: n.unread ? '.9rem' : '1rem' }}>
              <span className="list-ico">{n.icon}</span>
              <div className="list-body">
                <h3>{n.title}</h3>
                <p>{n.text}</p>
              </div>
              <span className="list-meta">{n.time}</span>
            </div>
          ))}
        </div>
      </section>
    </DashboardLayout>
  );
}
