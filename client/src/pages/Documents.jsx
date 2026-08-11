import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { patientApi } from '../api.js';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IcoFile = <svg viewBox="0 0 24 24" width="20" height="20" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></svg>;
const IcoDown = <svg viewBox="0 0 24 24" width="18" height="18" {...s}><path d="M12 4v11M8 11l4 4 4-4M5 20h14" /></svg>;

const CATS = ['All', 'Pending Review', 'Reviewed', 'Archived'];

export default function Documents() {
  const [cat, setCat] = useState('All');
  const [reports, setReports] = useState(null);

  useEffect(() => { patientApi('/portal/reports').then(setReports).catch(() => setReports([])); }, []);

  const all = reports || [];
  const list = cat === 'All' ? all : all.filter((d) => d.status === cat);

  return (
    <DashboardLayout active="documents">
      <div className="pg-head">
        <div>
          <h1>My Documents</h1>
          <p>All your reports, scans and expert opinions in one place.</p>
        </div>
      </div>

      <div className="chip-row">
        {CATS.map((cName) => (
          <button key={cName} type="button" className={'chip' + (cat === cName ? ' active' : '')} onClick={() => setCat(cName)}>{cName}</button>
        ))}
      </div>

      <section className="dash-card" style={{ padding: '.4rem 1.2rem' }}>
        {reports === null ? (
          <div className="empty" style={{ padding: '2rem 1rem' }}><p>Loading…</p></div>
        ) : list.length ? (
          <div className="list">
            {list.map((d) => (
              <div className="list-row" key={d.id}>
                <span className="list-ico">{IcoFile}</span>
                <div className="list-body">
                  <h3>{d.type}{d.category ? ` · ${d.category}` : ''}</h3>
                  <p>{d.status} · Uploaded {d.date || '—'}</p>
                </div>
                {d.fileUrl
                  ? <a className="dash-link" href={d.fileUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}>{IcoDown} View</a>
                  : <span className="dash-link" style={{ color: 'var(--muted)' }}>No file</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty" style={{ padding: '2rem 1rem' }}><p>{all.length ? 'No documents in this category.' : 'No documents yet — upload a report to get started.'}</p></div>
        )}
      </section>
    </DashboardLayout>
  );
}
