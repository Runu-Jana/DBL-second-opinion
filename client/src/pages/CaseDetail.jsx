import { Link, useParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { CASES, PROGRESS_STEPS, initials } from './portalData.js';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Ico = {
  back: <svg viewBox="0 0 24 24" {...s}><path d="m15 18-6-6 6-6" /></svg>,
  file: <svg viewBox="0 0 24 24" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></svg>,
  download: <svg viewBox="0 0 24 24" {...s}><path d="M12 4v11M8 11l4 4 4-4M5 20h14" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4 10-10" /></svg>,
};
const REPORTS = ['Biopsy Report.pdf', 'CT Scan – Chest.pdf', 'Blood Work Panel.pdf'];

export default function CaseDetail() {
  const { id } = useParams();
  const c = CASES.find((x) => x.id === id) || CASES[0];
  const opinionReady = c.status === 'Report Ready' || c.status === 'Completed';

  return (
    <DashboardLayout active="cases">
      <Link to="/dashboard/cases" className="back-link">{Ico.back} Back to My Cases</Link>

      <div className="pg-head">
        <div>
          <span className="case-id">{c.id}</span>
          <h1 style={{ marginTop: '.2rem' }}>{c.type}</h1>
          <p>Submitted on {c.date}</p>
        </div>
        <span className={'pill pill-' + c.tone} style={{ fontSize: '.82rem', padding: '.4rem .8rem' }}>{c.status}</span>
      </div>

      <div className="pg-two">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
          <section className="dash-card">
            <div className="dash-card-head"><h2>Case Progress</h2></div>
            <ul className="progress-list">
              {PROGRESS_STEPS.map((t, i) => {
                const state = i < c.step ? 'done' : i === c.step ? 'active' : 'todo';
                return (
                  <li className={'progress-step ' + state} key={t}>
                    <span className="step-dot">{state === 'done' ? Ico.check : null}</span>
                    <div className="step-text">
                      <strong>{t}</strong>
                      <span>{state === 'done' ? 'Completed' : state === 'active' ? 'In Progress' : 'Pending'}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="dash-card">
            <div className="dash-card-head"><h2>Uploaded Reports</h2><Link to="/dashboard/upload" className="dash-link">Add More</Link></div>
            <div className="list">
              {REPORTS.slice(0, c.reports > 3 ? 3 : c.reports).map((r) => (
                <div className="list-row" key={r}>
                  <span className="list-ico">{Ico.file}</span>
                  <div className="list-body"><h3>{r}</h3><p>PDF · Uploaded {c.date}</p></div>
                  <button type="button" className="dash-link" title="Coming soon">Download</button>
                </div>
              ))}
            </div>
          </section>

          <section className="dash-card">
            <div className="dash-card-head"><h2>Expert Opinion</h2></div>
            {opinionReady ? (
              <div className="list-row" style={{ borderBottom: 0, background: 'var(--teal-050)', borderRadius: '12px' }}>
                <span className="list-ico" style={{ background: '#fff' }}>{Ico.download}</span>
                <div className="list-body"><h3>Second Opinion Report</h3><p>Reviewed by {c.doctor} · Ready to download</p></div>
                <button type="button" className="btn btn-primary" style={{ padding: '.55rem 1rem', fontSize: '.82rem' }} title="Coming soon">Download</button>
              </div>
            ) : (
              <div className="empty" style={{ padding: '1.6rem 1rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                <p>Your expert opinion is being prepared. We'll notify you within 24–48 hours.</p>
              </div>
            )}
          </section>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
          <section className="dash-card">
            <div className="dash-card-head"><h2>Assigned Specialist</h2></div>
            <div style={{ display: 'flex', gap: '.9rem', alignItems: 'center' }}>
              <span className="user-avatar" style={{ width: 48, height: 48, fontSize: '1rem' }}>{initials(c.doctor.replace('Dr. ', ''))}</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '.98rem', fontWeight: 800 }}>{c.doctor}</h3>
                <p style={{ margin: '.1rem 0 0', fontSize: '.82rem', color: 'var(--muted)' }}>{c.specialty}</p>
              </div>
            </div>
            <Link to="/dashboard/messages" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', padding: '.65rem', fontSize: '.85rem' }}>Message Specialist</Link>
          </section>
          <section className="dash-card need-help">
            <h3>Book a Consultation</h3>
            <p>Discuss this opinion with your specialist over a video call.</p>
            <Link to="/dashboard/appointments" className="btn btn-primary">Schedule Now</Link>
          </section>
        </aside>
      </div>
    </DashboardLayout>
  );
}
