import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Ico = {
  cases: <svg viewBox="0 0 24 24" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M9.5 12h5M9.5 15h5" /></svg>,
  reports: <svg viewBox="0 0 24 24" {...s}><path d="M6 3h9l3 3v15H6z" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>,
  review: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.3 2.3L15.5 9.5" /></svg>,
  video: <svg viewBox="0 0 24 24" {...s}><rect x="3" y="6" width="12" height="12" rx="2" /><path d="m15 10 6-3v10l-6-3Z" /></svg>,
  coord: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" /></svg>,
  headset: <svg viewBox="0 0 24 24" {...s}><path d="M4 13v-1a8 8 0 0 1 16 0v1M4 13a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h1v-5H4M20 13a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-1v-5h1M20 18v1a3 3 0 0 1-3 3h-3" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4 10-10" /></svg>,
};

const CASES = [
  { id: 'DBL-2025-001', type: 'Breast Cancer', date: '10 May, 2025', status: 'In Review', tone: 'review' },
  { id: 'DBL-2025-002', type: 'Lung Cancer', date: '05 May, 2025', status: 'Report Ready', tone: 'ready' },
];

const PROGRESS = [
  { t: 'Report Uploaded', s: 'Completed', state: 'done' },
  { t: 'Under Review', s: 'In Progress', state: 'active' },
  { t: 'Expert Opinion', s: 'Pending', state: 'todo' },
  { t: 'Consultation', s: 'Pending', state: 'todo' },
];

export default function Dashboard() {
  const { session } = useAuth();
  const name = session?.name || 'Rajesh Kumar';

  return (
    <DashboardLayout active="dashboard">
      <div className="dash-welcome">
        <h1>Welcome Back, {name} <span role="img" aria-label="wave">👋</span></h1>
        <p>Here's an overview of your health journey.</p>
      </div>

      <div className="dash-grid">
        <div className="dash-main-col">
          {/* stat cards */}
          <div className="dash-stats">
            <div className="stat-card">
              <span className="stat-ico">{Ico.cases}</span>
              <div className="stat-meta">
                <span className="stat-label">My Cases</span>
                <span className="stat-value">02</span>
                <span className="stat-sub">Active Cases</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-ico">{Ico.reports}</span>
              <div className="stat-meta">
                <span className="stat-label">Reports Uploaded</span>
                <span className="stat-value">03</span>
                <span className="stat-sub">Total Reports</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-ico ok">{Ico.review}</span>
              <div className="stat-meta">
                <span className="stat-label">Reports Under Review</span>
                <span className="stat-value sm">15 May, 2025</span>
                <span className="stat-sub">10:30 AM</span>
              </div>
            </div>
          </div>

          {/* recent cases */}
          <section className="dash-card">
            <div className="dash-card-head">
              <h2>Recent Cases</h2>
              <button type="button" className="dash-link" title="Coming soon">View All</button>
            </div>
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr><th>Case ID</th><th>Disease Type</th><th>Date</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {CASES.map((c) => (
                    <tr key={c.id}>
                      <td className="mono">{c.id}</td>
                      <td>{c.type}</td>
                      <td>{c.date}</td>
                      <td><span className={'pill pill-' + c.tone}>{c.status}</span></td>
                      <td><button type="button" className="dash-link" title="Coming soon">View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* appointment + messages */}
          <div className="dash-duo">
            <section className="dash-card">
              <div className="dash-card-head"><h2>Appointment</h2></div>
              <div className="appt">
                <div className="appt-date">
                  <strong>15</strong>
                  <span>10:30 AM</span>
                </div>
                <div className="appt-info">
                  <h3>Dr. Priya Sharma</h3>
                  <p>Medical Oncologist</p>
                  <p className="appt-mode"><span className="appt-mode-ico">{Ico.video}</span> Video Consultation</p>
                  <button type="button" className="btn btn-primary appt-btn" title="Coming soon">Join Meeting</button>
                </div>
              </div>
            </section>

            <section className="dash-card">
              <div className="dash-card-head">
                <h2>Messages</h2>
                <button type="button" className="dash-link" title="Coming soon">View All</button>
              </div>
              <div className="msg">
                <span className="msg-ico">{Ico.coord}</span>
                <div className="msg-body">
                  <div className="msg-top"><strong>Care Coordinator</strong><span>10 May, 2025</span></div>
                  <p>Your report has been reviewed by our experts.</p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* right column */}
        <aside className="dash-side-col">
          <section className="dash-card">
            <div className="dash-card-head"><h2>Case Progress</h2></div>
            <ul className="progress-list">
              {PROGRESS.map((p, i) => (
                <li className={'progress-step ' + p.state} key={i}>
                  <span className="step-dot">{p.state === 'done' ? Ico.check : null}</span>
                  <div className="step-text">
                    <strong>{p.t}</strong>
                    <span>{p.s}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="dash-card need-help">
            <span className="need-help-ico">{Ico.headset}</span>
            <h3>Need Help?</h3>
            <p>Our care team is here to assist you.</p>
            <button type="button" className="btn btn-primary" title="Coming soon">Contact Support</button>
          </section>
        </aside>
      </div>
    </DashboardLayout>
  );
}
