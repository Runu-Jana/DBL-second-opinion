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
// Case-level statuses (from /portal/cases), not the per-file report statuses.
const STONE = { 'Awaiting Review': 'amber', 'Under Review': 'blue', 'Opinion Ready': 'green', Delivered: 'green', Pending: 'amber' };
const initials = (n = '') => n.replace(/^(Dr|Mr|Ms|Mrs)\.?\s*/i, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const STEPS = ['Report Received', 'Triaged & Categorised', 'Specialist Assigned', 'Reviewed by Specialist'];

export default function CaseDetail() {
  const { id } = useParams();
  const [kase, setKase] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    // A case is the whole group of documents the patient sent, not a single file. The link that
    // brought us here carries one document's id (or the case id), so find the case that holds it
    // and show every document in it — the previous version showed only the one file that was
    // clicked, which lost the rest of a multi-document upload.
    patientApi('/portal/cases')
      .then((list) => {
        const found = list.find((c) => String(c.id) === String(id))
          || list.find((c) => (c.documents || []).some((d) => String(d.id) === String(id)));
        setKase(found || null);
      })
      .catch(() => setKase(null));
  }, [id]);

  if (kase === undefined) return <DashboardLayout active="cases"><div className="dash-card empty"><p>Loading…</p></div></DashboardLayout>;
  if (kase === null) return (
    <DashboardLayout active="cases">
      <Link to="/dashboard/cases" className="back-link">{Ico.back} Back to My Cases</Link>
      <div className="dash-card empty"><p>This case could not be found.</p></div>
    </DashboardLayout>
  );

  const c = kase;
  const documents = c.documents || [];
  // Derive live progress from the case's real triage/review state (set by admin + doctor).
  const done = [true, !!c.cancerType, !!c.doctor, !!c.delivered];
  const step = done.filter(Boolean).length; // index of the current (first not-done) step
  const reviewed = done[3];

  return (
    <DashboardLayout active="cases">
      <Link to="/dashboard/cases" className="back-link">{Ico.back} Back to My Cases</Link>

      <div className="pg-head">
        <div>
          <span className="case-id">{c.reference || `DBL-${String(c.id).padStart(4, '0')}`}</span>
          <h1 style={{ marginTop: '.2rem' }}>{c.cancerType || 'Second opinion review'}</h1>
          <p>Submitted on {c.submittedDate || '—'}</p>
        </div>
        <span className={'pill pill-' + (STONE[c.status] || 'blue')} style={{ fontSize: '.82rem', padding: '.4rem .8rem' }}>{c.delivered ? 'Opinion ready' : c.status}</span>
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
            <div className="dash-card-head">
              <h2>Uploaded Reports{documents.length > 1 ? ` (${documents.length})` : ''}</h2>
              <Link to="/dashboard/upload" className="dash-link">Add More</Link>
            </div>
            <div className="list">
              {documents.length ? documents.map((d) => (
                <div className="list-row" key={d.id}>
                  <span className="list-ico">{Ico.file}</span>
                  <div className="list-body"><h3>{d.type || 'Document'}</h3><p>Uploaded {d.date || '—'}</p></div>
                  {d.fileUrl
                    ? <a className="dash-link" href={d.fileUrl} target="_blank" rel="noreferrer">View</a>
                    : <span className="dash-link" style={{ color: 'var(--muted)' }}>—</span>}
                </div>
              )) : (
                <div className="list-row"><div className="list-body"><p>No documents on this case.</p></div></div>
              )}
            </div>
          </section>

          <section className="dash-card">
            <div className="dash-card-head"><h2>Expert Opinion</h2></div>
            {reviewed ? (
              <div className="list-row" style={{ borderBottom: 0, background: 'var(--teal-050)', borderRadius: '12px' }}>
                <span className="list-ico" style={{ background: '#fff' }}>{Ico.download}</span>
                <div className="list-body"><h3>Second Opinion Ready</h3><p>Reviewed by {c.doctor || 'our specialist'}</p></div>
                <Link to="/dashboard/opinion" className="btn btn-primary" style={{ padding: '.55rem 1rem', fontSize: '.82rem' }}>Read opinion</Link>
              </div>
            ) : (
              <div className="empty" style={{ padding: '1.6rem 1rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                <p>{c.doctor ? `Dr. ${c.doctor.replace(/^Dr\.?\s*/i, '')} is reviewing your reports. We'll notify you within 24–48 hours.` : 'Your reports are being triaged. A specialist will be assigned shortly.'}</p>
              </div>
            )}
          </section>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
          <section className="dash-card">
            <div className="dash-card-head"><h2>Assigned Specialist</h2></div>
            {c.doctor ? (
              <>
                <div style={{ display: 'flex', gap: '.9rem', alignItems: 'center' }}>
                  <span className="user-avatar" style={{ width: 48, height: 48, fontSize: '1rem' }}>{initials(c.doctor)}</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '.98rem', fontWeight: 800 }}>{c.doctor}</h3>
                    <p style={{ margin: '.1rem 0 0', fontSize: '.82rem', color: 'var(--muted)' }}>{c.cancerType || 'Oncology'} specialist</p>
                  </div>
                </div>
                <Link to="/dashboard/messages" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', padding: '.65rem', fontSize: '.85rem' }}>Message Specialist</Link>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: '.86rem', color: 'var(--muted)' }}>A specialist is assigned once our counsellor categorises your reports.</p>
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
