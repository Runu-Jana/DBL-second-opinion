import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IcoFile = <svg viewBox="0 0 24 24" width="20" height="20" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></svg>;
const IcoDown = <svg viewBox="0 0 24 24" width="18" height="18" {...s}><path d="M12 4v11M8 11l4 4 4-4M5 20h14" /></svg>;

const DOCS = [
  { name: 'Biopsy Report.pdf', cat: 'Reports', size: '1.2 MB', date: '10 May, 2025' },
  { name: 'CT Scan – Chest.pdf', cat: 'Imaging', size: '4.6 MB', date: '10 May, 2025' },
  { name: 'Blood Work Panel.pdf', cat: 'Reports', size: '820 KB', date: '09 May, 2025' },
  { name: 'Second Opinion – DBL-2025-002.pdf', cat: 'Opinions', size: '640 KB', date: '08 May, 2025' },
  { name: 'Discharge Summary.pdf', cat: 'Reports', size: '1.0 MB', date: '28 Apr, 2025' },
];
const CATS = ['All', 'Reports', 'Imaging', 'Opinions'];

export default function Documents() {
  const [cat, setCat] = useState('All');
  const list = cat === 'All' ? DOCS : DOCS.filter((d) => d.cat === cat);

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
        <div className="list">
          {list.map((d) => (
            <div className="list-row" key={d.name}>
              <span className="list-ico">{IcoFile}</span>
              <div className="list-body">
                <h3>{d.name}</h3>
                <p>{d.cat} · {d.size} · {d.date}</p>
              </div>
              <button type="button" className="dash-link" title="Coming soon" style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}>{IcoDown} Download</button>
            </div>
          ))}
        </div>
      </section>
    </DashboardLayout>
  );
}
