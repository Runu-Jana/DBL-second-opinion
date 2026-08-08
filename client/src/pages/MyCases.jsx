import { useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { CASES } from './portalData.js';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IcoDoc = <svg viewBox="0 0 24 24" width="15" height="15" {...s}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" /></svg>;
const IcoFile = <svg viewBox="0 0 24 24" width="15" height="15" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></svg>;

const FILTERS = ['All', 'In Review', 'Report Ready', 'Completed'];

export default function MyCases() {
  const [filter, setFilter] = useState('All');
  const list = filter === 'All' ? CASES : CASES.filter((c) => c.status === filter);

  return (
    <DashboardLayout active="cases">
      <div className="pg-head">
        <div>
          <h1>My Cases</h1>
          <p>Track every second-opinion case and its progress.</p>
        </div>
        <Link to="/dashboard/upload" className="btn btn-primary pg-action">+ New Case</Link>
      </div>

      <div className="chip-row">
        {FILTERS.map((f) => {
          const n = f === 'All' ? CASES.length : CASES.filter((c) => c.status === f).length;
          return (
            <button key={f} type="button" className={'chip' + (filter === f ? ' active' : '')} onClick={() => setFilter(f)}>
              {f} <span className="chip-n">{n}</span>
            </button>
          );
        })}
      </div>

      {list.length ? (
        <div className="pg-grid">
          {list.map((c) => (
            <article className="case-card" key={c.id}>
              <div className="case-card-top">
                <span className="case-id">{c.id}</span>
                <span className={'pill pill-' + c.tone}>{c.status}</span>
              </div>
              <h3>{c.type}</h3>
              <div className="case-row">{IcoDoc} {c.doctor} · {c.specialty}</div>
              <div className="case-row">{IcoFile} {c.reports} reports · Submitted {c.date}</div>
              <div className="case-foot">
                <span className="case-row" style={{ color: 'var(--muted)' }}>Case #{c.id.split('-').pop()}</span>
                <Link to={'/dashboard/cases/' + c.id} className="dash-link">View Details →</Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="dash-card empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7 3h7l4 4v14H7z" /></svg>
          <p>No cases in this category yet.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
