import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { patientApi } from '../api.js';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Ico = {
  video: <svg viewBox="0 0 24 24" width="15" height="15" {...s}><rect x="3" y="6" width="12" height="12" rx="2" /><path d="m15 10 6-3v10l-6-3Z" /></svg>,
  clock: <svg viewBox="0 0 24 24" width="15" height="15" {...s}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
};
const PAST_STATUS = ['Completed', 'Cancelled'];

// Best-effort day/month split from a display date like "16 May 2024".
function dayMon(date) {
  if (!date) return { d: '—', mon: '' };
  const parts = String(date).split(/[\s,]+/).filter(Boolean);
  return { d: parts[0] || '—', mon: (parts[1] || '').slice(0, 3) };
}

function ApptCard({ a, past }) {
  const { d, mon } = dayMon(a.date);
  return (
    <article className="dash-card" style={{ display: 'flex', gap: '1.1rem', alignItems: 'center' }}>
      <div className="appt-date" style={{ minWidth: 74 }}>
        <strong>{d}</strong>
        <span>{mon}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ margin: '0 0 .15rem', fontSize: '1rem', fontWeight: 800 }}>{a.doctor || 'To be assigned'}</h3>
        <p style={{ margin: 0, fontSize: '.82rem', color: 'var(--muted)' }}>{a.type}</p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '.45rem', flexWrap: 'wrap', fontSize: '.8rem', color: 'var(--teal-dark)', fontWeight: 600 }}>
          {a.time && <span style={{ display: 'inline-flex', gap: '.35rem', alignItems: 'center' }}>{Ico.clock} {a.time}</span>}
          <span style={{ display: 'inline-flex', gap: '.35rem', alignItems: 'center' }}>{Ico.video} {a.mode}</span>
        </div>
      </div>
      {past
        ? <span className={'pill pill-' + (a.status === 'Cancelled' ? 'gray' : 'done')}>{a.status}</span>
        : <span className="pill pill-blue">{a.status}</span>}
    </article>
  );
}

export default function Appointments() {
  const [tab, setTab] = useState('upcoming');
  const [appts, setAppts] = useState(null);

  useEffect(() => { patientApi('/portal/appointments').then(setAppts).catch(() => setAppts([])); }, []);

  const all = appts || [];
  const upcoming = all.filter((a) => !PAST_STATUS.includes(a.status));
  const past = all.filter((a) => PAST_STATUS.includes(a.status));
  const list = tab === 'upcoming' ? upcoming : past;

  return (
    <DashboardLayout active="appointments">
      <div className="pg-head">
        <div>
          <h1>My Appointments</h1>
          <p>Your scheduled and past consultations.</p>
        </div>
      </div>

      <div className="chip-row">
        <button type="button" className={'chip' + (tab === 'upcoming' ? ' active' : '')} onClick={() => setTab('upcoming')}>Upcoming <span className="chip-n">{upcoming.length}</span></button>
        <button type="button" className={'chip' + (tab === 'past' ? ' active' : '')} onClick={() => setTab('past')}>Past <span className="chip-n">{past.length}</span></button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {appts === null
          ? <div className="dash-card empty"><p>Loading…</p></div>
          : list.length
            ? list.map((a) => <ApptCard key={a.id} a={a} past={tab === 'past'} />)
            : <div className="dash-card empty"><p>No {tab} appointments. Your care coordinator schedules these once a specialist reviews your report.</p></div>}
      </div>
    </DashboardLayout>
  );
}
