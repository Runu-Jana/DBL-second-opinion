import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { patientApi } from '../api.js';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Ico = {
  cases: <svg viewBox="0 0 24 24" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M9.5 12h5M9.5 15h5" /></svg>,
  reports: <svg viewBox="0 0 24 24" {...s}><path d="M6 3h9l3 3v15H6z" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>,
  review: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.3 2.3L15.5 9.5" /></svg>,
  coord: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" /></svg>,
  headset: <svg viewBox="0 0 24 24" {...s}><path d="M4 13v-1a8 8 0 0 1 16 0v1M4 13a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h1v-5H4M20 13a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-1v-5h1M20 18v1a3 3 0 0 1-3 3h-3" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4 10-10" /></svg>,
};

const STONE = { 'Pending Review': 'amber', Reviewed: 'green', Uploaded: 'blue', Archived: 'gray' };
const pad = (n) => String(n).padStart(2, '0');

// Overall journey progress, derived from the patient's most recent report.
function progressFor(r) {
  if (!r) return [
    { t: 'Report Uploaded', state: 'todo' },
    { t: 'Triaged & Categorised', state: 'todo' },
    { t: 'Specialist Assigned', state: 'todo' },
    { t: 'Expert Opinion', state: 'todo' },
  ];
  const done = [true, !!r.category, !!r.doctor, r.status === 'Reviewed' || r.status === 'Archived'];
  const step = done.filter(Boolean).length;
  const labels = ['Report Uploaded', 'Triaged & Categorised', 'Specialist Assigned', 'Expert Opinion'];
  return labels.map((t, i) => ({ t, state: i < step ? 'done' : i === step ? 'active' : 'todo' }));
}

export default function Dashboard() {
  const { session, justSignedUp } = useAuth();
  const name = session?.name || 'there';
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState(null);

  useEffect(() => {
    patientApi('/portal/me').then((r) => setStats(r.stats)).catch(() => setStats({ reports: 0, pendingReports: 0, appointments: 0, cases: 0 }));
    patientApi('/portal/reports').then(setReports).catch(() => setReports([]));
  }, []);

  const recent = (reports || []).slice(0, 5);
  const latest = (reports || [])[0];
  const progress = progressFor(latest);

  return (
    <DashboardLayout active="dashboard">
      <div className="dash-welcome">
        <h1>{justSignedUp ? 'Welcome to DBL International' : 'Welcome Back'}, {name} <span role="img" aria-label="wave">👋</span></h1>
        <p>{justSignedUp ? 'Your account is ready — upload your first report to begin your second-opinion journey.' : "Here's an overview of your health journey."}</p>
      </div>

      <div className="dash-grid">
        <div className="dash-main-col">
          {/* stat cards */}
          <div className="dash-stats">
            <div className="stat-card">
              <span className="stat-ico">{Ico.cases}</span>
              <div className="stat-meta">
                <span className="stat-label">My Cases</span>
                <span className="stat-value">{stats ? pad(stats.cases) : '—'}</span>
                <span className="stat-sub">Second-opinion cases</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-ico">{Ico.reports}</span>
              <div className="stat-meta">
                <span className="stat-label">Reports Uploaded</span>
                <span className="stat-value">{stats ? pad(stats.reports) : '—'}</span>
                <span className="stat-sub">Total Reports</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-ico ok">{Ico.review}</span>
              <div className="stat-meta">
                <span className="stat-label">Awaiting Review</span>
                <span className="stat-value">{stats ? pad(stats.pendingReports) : '—'}</span>
                <span className="stat-sub">Pending specialist</span>
              </div>
            </div>
          </div>

          {/* recent cases */}
          <section className="dash-card">
            <div className="dash-card-head">
              <h2>Recent Cases</h2>
              <Link to="/dashboard/cases" className="dash-link">View All</Link>
            </div>
            <div className="dash-table-wrap">
              {recent.length ? (
                <table className="dash-table">
                  <thead>
                    <tr><th>Case ID</th><th>Report Type</th><th>Date</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {recent.map((r) => (
                      <tr key={r.id}>
                        <td className="mono">DBL-{String(r.id).padStart(4, '0')}</td>
                        <td>{r.type}{r.category ? ` · ${r.category}` : ''}</td>
                        <td>{r.date || '—'}</td>
                        <td><span className={'pill pill-' + (STONE[r.status] || 'blue')}>{r.status}</span></td>
                        <td><Link to={'/dashboard/cases/' + r.id} className="dash-link">View</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty" style={{ padding: '2rem 1rem' }}>
                  <p>{reports === null ? 'Loading…' : 'No reports yet.'} <Link to="/dashboard/upload" className="dash-link">Upload your first report →</Link></p>
                </div>
              )}
            </div>
          </section>

          {/* messages */}
          <section className="dash-card">
            <div className="dash-card-head"><h2>Latest Update</h2></div>
            <div className="msg">
              <span className="msg-ico">{Ico.coord}</span>
              <div className="msg-body">
                <div className="msg-top"><strong>Care Coordinator</strong><span>{latest?.date || ''}</span></div>
                <p>{latest
                  ? (latest.status === 'Reviewed' || latest.status === 'Archived'
                    ? `Your report has been reviewed${latest.doctor ? ` by ${latest.doctor}` : ''}. Your expert opinion is ready.`
                    : latest.doctor
                      ? `${latest.doctor} has been assigned to your ${latest.category || ''} case and is reviewing your report.`
                      : latest.category
                        ? `Your report has been categorised as ${latest.category}. A specialist is being assigned.`
                        : 'We have received your report and our team is triaging it.')
                  : 'Upload a report to begin your second-opinion journey.'}</p>
              </div>
            </div>
          </section>
        </div>

        {/* right column */}
        <aside className="dash-side-col">
          <section className="dash-card">
            <div className="dash-card-head"><h2>Case Progress</h2></div>
            <ul className="progress-list">
              {progress.map((p, i) => (
                <li className={'progress-step ' + p.state} key={i}>
                  <span className="step-dot">{p.state === 'done' ? Ico.check : null}</span>
                  <div className="step-text">
                    <strong>{p.t}</strong>
                    <span>{p.state === 'done' ? 'Completed' : p.state === 'active' ? 'In Progress' : 'Pending'}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="dash-card need-help">
            <div className="card-head center">
              <span className="need-help-ico">{Ico.headset}</span>
              <h3>Need Help?</h3>
            </div>
            <p>Our care team is here to assist you.</p>
            <Link to="/contact" className="btn btn-primary">Contact Support</Link>
          </section>
        </aside>
      </div>
    </DashboardLayout>
  );
}
