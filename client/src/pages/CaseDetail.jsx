import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { patientApi } from '../api.js';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Ico = {
  back: <svg viewBox="0 0 24 24" {...s}><path d="m15 18-6-6 6-6" /></svg>,
  file: <svg viewBox="0 0 24 24" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></svg>,
  download: <svg viewBox="0 0 24 24" {...s}><path d="M12 4v11M8 11l4 4 4-4M5 20h14" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4 10-10" /></svg>,
};
const STONE = { 'Pending Review': 'amber', Reviewed: 'green', Uploaded: 'blue', Archived: 'gray' };
const initials = (n = '') => n.replace(/^(Dr|Mr|Ms|Mrs)\.?\s*/i, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const STEPS = ['Report Received', 'Triaged & Categorised', 'Specialist Assigned', 'Reviewed by Specialist'];

export default function CaseDetail() {
  const { id } = useParams();
  const [report, setReport] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    patientApi('/portal/reports')
      .then((list) => setReport(list.find((r) => String(r.id) === String(id)) || null))
      .catch(() => setReport(null));
  }, [id]);

  if (report === undefined) return <DashboardLayout active="cases"><div className="dash-card empty"><p>Loading…</p></div></DashboardLayout>;
  if (report === null) return (
    <DashboardLayout active="cases">
      <Link to="/dashboard/cases" className="back-link">{Ico.back} Back to My Cases</Link>
      <div className="dash-card empty"><p>This case could not be found.</p></div>
    </DashboardLayout>
  );

  const r = report;
  // Derive live progress from the report's real triage/review state (set by admin + doctor).
  const done = [true, !!r.category, !!r.doctor, r.status === 'Reviewed' || r.status === 'Archived'];
  const step = done.filter(Boolean).length; // index of the current (first not-done) step
  const reviewed = done[3];

  return (
    <DashboardLayout active="cases">
      <Link to="/dashboard/cases" className="back-link">{Ico.back} Back to My Cases</Link>

      <div className="pg-head">
        <div>
          <span className="case-id">DBL-{String(r.id).padStart(4, '0')}</span>
          <h1 style={{ marginTop: '.2rem' }}>{r.type}{r.category ? ` · ${r.category}` : ''}</h1>
          <p>Submitted on {r.date || '—'}</p>
        </div>
        <span className={'pill pill-' + (STONE[r.status] || 'blue')} style={{ fontSize: '.82rem', padding: '.4rem .8rem' }}>{r.status}</span>
      </div>

      <div className="pg-two">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
          <section className="dash-card">
            <div className="dash-card-head"><h2>Case Progress</h2></div>
            <ul className="progress-list">
              {STEPS.map((t, i) => {
                const state = i < step ? 'done' : i === step ? 'active' : 'todo';
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
            <div className="dash-card-head"><h2>Uploaded Report</h2><Link to="/dashboard/upload" className="dash-link">Add More</Link></div>
            <div className="list">
              <div className="list-row">
                <span className="list-ico">{Ico.file}</span>
                <div className="list-body"><h3>{r.type}</h3><p>Uploaded {r.date || '—'}</p></div>
                {r.fileUrl
                  ? <a className="dash-link" href={r.fileUrl} target="_blank" rel="noreferrer">View</a>
                  : <span className="dash-link" style={{ color: 'var(--muted)' }}>—</span>}
              </div>
            </div>
          </section>

          <section className="dash-card">
            <div className="dash-card-head"><h2>Expert Opinion</h2></div>
            {reviewed ? (
              <div className="list-row" style={{ borderBottom: 0, background: 'var(--teal-050)', borderRadius: '12px' }}>
                <span className="list-ico" style={{ background: '#fff' }}>{Ico.download}</span>
                <div className="list-body"><h3>Second Opinion Ready</h3><p>Reviewed by {r.doctor || 'our specialist'}{r.notes ? ` · ${r.notes}` : ''}</p></div>
                {r.fileUrl && <a className="btn btn-primary" style={{ padding: '.55rem 1rem', fontSize: '.82rem' }} href={r.fileUrl} target="_blank" rel="noreferrer">View</a>}
              </div>
            ) : (
              <div className="empty" style={{ padding: '1.6rem 1rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                <p>{r.doctor ? `Dr. ${r.doctor.replace(/^Dr\.?\s*/i, '')} is reviewing your report. We'll notify you within 24–48 hours.` : 'Your report is being triaged. A specialist will be assigned shortly.'}</p>
              </div>
            )}
          </section>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
          <section className="dash-card">
            <div className="dash-card-head"><h2>Assigned Specialist</h2></div>
            {r.doctor ? (
              <>
                <div style={{ display: 'flex', gap: '.9rem', alignItems: 'center' }}>
                  <span className="user-avatar" style={{ width: 48, height: 48, fontSize: '1rem' }}>{initials(r.doctor)}</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '.98rem', fontWeight: 800 }}>{r.doctor}</h3>
                    <p style={{ margin: '.1rem 0 0', fontSize: '.82rem', color: 'var(--muted)' }}>{r.category || 'Oncology'} specialist</p>
                  </div>
                </div>
                <Link to="/dashboard/messages" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', padding: '.65rem', fontSize: '.85rem' }}>Message Specialist</Link>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: '.86rem', color: 'var(--muted)' }}>A specialist is assigned once our counsellor categorises your report.</p>
            )}
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
