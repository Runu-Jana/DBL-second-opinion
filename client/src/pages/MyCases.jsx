import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { patientApi } from '../api.js';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IcoDoc = <svg viewBox="0 0 24 24" width="15" height="15" {...s}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" /></svg>;
const IcoFile = <svg viewBox="0 0 24 24" width="15" height="15" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></svg>;

const STONE = { 'Pending Review': 'amber', Reviewed: 'green', Uploaded: 'blue', Archived: 'gray' };
const FILTERS = ['All', 'Pending Review', 'Reviewed', 'Archived'];

export default function MyCases() {
  const [filter, setFilter] = useState('All');
  const [reports, setReports] = useState(null); // null = loading
  const [err, setErr] = useState('');

  useEffect(() => {
    patientApi('/portal/reports').then(setReports).catch((e) => { setErr(e.message); setReports([]); });
  }, []);

  const all = reports || [];
  const list = filter === 'All' ? all : all.filter((r) => r.status === filter);

  return (
    <DashboardLayout active="cases">
      <div className="pg-head">
        <div>
          <h1>My Cases</h1>
          <p>Track every report you've submitted and its review progress.</p>
        </div>
        <Link to="/dashboard/upload" className="btn btn-primary pg-action">+ New Upload</Link>
      </div>

      <div className="chip-row">
        {FILTERS.map((f) => {
          const n = f === 'All' ? all.length : all.filter((c) => c.status === f).length;
          return (
            <button key={f} type="button" className={'chip' + (filter === f ? ' active' : '')} onClick={() => setFilter(f)}>
              {f} <span className="chip-n">{n}</span>
            </button>
          );
        })}
      </div>

      {reports === null ? (
        <div className="dash-card empty"><p>Loading your cases…</p></div>
      ) : list.length ? (
        <div className="pg-grid">
          {list.map((r) => (
            <article className="case-card" key={r.id}>
              <div className="case-card-top">
                <span className="case-id">DBL-{String(r.id).padStart(4, '0')}</span>
                <span className={'pill pill-' + (STONE[r.status] || 'blue')}>{r.status}</span>
              </div>
              <h3>{r.type}{r.category ? ` · ${r.category}` : ''}</h3>
              <div className="case-row">{IcoDoc} {r.doctor || (r.category ? 'Assigning specialist…' : 'Awaiting triage')}</div>
              <div className="case-row">{IcoFile} Submitted {r.date || '—'}</div>
              <div className="case-foot">
                <span className="case-row" style={{ color: 'var(--muted)' }}>Case #{r.id}</span>
                <Link to={'/dashboard/cases/' + r.id} className="dash-link">View Details →</Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="dash-card empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7 3h7l4 4v14H7z" /></svg>
          <p>{err ? err : all.length ? 'No cases in this category.' : 'No reports yet — upload one to get started.'}</p>
        </div>
      )}
    </DashboardLayout>
  );
}
