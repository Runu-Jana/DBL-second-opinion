import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { patientApi } from '../api.js';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IcoDoc = <svg viewBox="0 0 24 24" width="15" height="15" {...s}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" /></svg>;
const IcoFile = <svg viewBox="0 0 24 24" width="15" height="15" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></svg>;

const STONE = { 'Awaiting Review': 'amber', 'Under Review': 'blue', 'Opinion Ready': 'green', Delivered: 'green' };
const FILTERS = ['All', 'Awaiting Review', 'Under Review', 'Delivered'];

export default function MyCases() {
  const [filter, setFilter] = useState('All');
  const [cases, setCases] = useState(null); // null = loading
  const [err, setErr] = useState('');

  useEffect(() => {
    patientApi('/portal/cases').then(setCases).catch((e) => { setErr(e.message); setCases([]); });
  }, []);

  const all = cases || [];
  const list = filter === 'All' ? all : all.filter((c) => c.status === filter);

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

      {cases === null ? (
        <div className="dash-card empty"><p>Loading your cases…</p></div>
      ) : list.length ? (
        <div className="pg-grid">
          {list.map((c) => (
            <article className="case-card" key={c.id}>
              <div className="case-card-top">
                <span className="case-id">{c.reference}</span>
                <span className={'pill pill-' + (STONE[c.status] || 'blue')}>{c.delivered ? 'Opinion ready' : c.status}</span>
              </div>
              <h3>{c.cancerType || 'Second opinion'}</h3>
              <div className="case-row">{IcoDoc} {c.doctor || 'Awaiting specialist'}</div>
              <div className="case-row">{IcoFile} {c.documents.length} document{c.documents.length === 1 ? '' : 's'}{c.submittedDate ? ` · submitted ${c.submittedDate}` : ''}</div>
              <div className="case-foot">
                <span className="case-row" style={{ color: 'var(--muted)' }}>
                  {c.delivered ? 'Your opinion is ready to read' : 'We will let you know when it is ready'}
                </span>
                {c.documents[0] && <Link to={'/dashboard/cases/' + c.documents[0].id} className="dash-link">View Details →</Link>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="dash-card empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7 3h7l4 4v14H7z" /></svg>
          <p>{err ? err : all.length ? 'No cases in this category.' : 'No cases yet — upload your reports to get started.'}</p>
        </div>
      )}
    </DashboardLayout>
  );
}
