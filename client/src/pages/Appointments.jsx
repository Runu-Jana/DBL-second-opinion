import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Ico = {
  video: <svg viewBox="0 0 24 24" width="15" height="15" {...s}><rect x="3" y="6" width="12" height="12" rx="2" /><path d="m15 10 6-3v10l-6-3Z" /></svg>,
  clock: <svg viewBox="0 0 24 24" width="15" height="15" {...s}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
};
const UPCOMING = [
  { d: '15', mon: 'May', time: '10:30 AM', doctor: 'Dr. Priya Sharma', specialty: 'Medical Oncology', mode: 'Video Consultation' },
];
const PAST = [
  { d: '02', mon: 'May', time: '04:00 PM', doctor: 'Dr. Arjun Mehta', specialty: 'Radiation Oncology', mode: 'Video Consultation', status: 'Completed' },
  { d: '18', mon: 'Apr', time: '11:00 AM', doctor: 'Dr. Neha Rao', specialty: 'Surgical Oncology', mode: 'Video Consultation', status: 'Completed' },
];

function ApptCard({ a, past }) {
  return (
    <article className="dash-card" style={{ display: 'flex', gap: '1.1rem', alignItems: 'center' }}>
      <div className="appt-date" style={{ minWidth: 74 }}>
        <strong>{a.d}</strong>
        <span>{a.mon}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ margin: '0 0 .15rem', fontSize: '1rem', fontWeight: 800 }}>{a.doctor}</h3>
        <p style={{ margin: 0, fontSize: '.82rem', color: 'var(--muted)' }}>{a.specialty}</p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '.45rem', flexWrap: 'wrap', fontSize: '.8rem', color: 'var(--teal-dark)', fontWeight: 600 }}>
          <span style={{ display: 'inline-flex', gap: '.35rem', alignItems: 'center' }}>{Ico.clock} {a.time}</span>
          <span style={{ display: 'inline-flex', gap: '.35rem', alignItems: 'center' }}>{Ico.video} {a.mode}</span>
        </div>
      </div>
      {past
        ? <span className="pill pill-done">{a.status}</span>
        : <button type="button" className="btn btn-primary" style={{ padding: '.6rem 1.1rem', fontSize: '.85rem' }} title="Coming soon">Join Meeting</button>}
    </article>
  );
}

export default function Appointments() {
  const [tab, setTab] = useState('upcoming');
  const list = tab === 'upcoming' ? UPCOMING : PAST;

  return (
    <DashboardLayout active="appointments">
      <div className="pg-head">
        <div>
          <h1>My Appointments</h1>
          <p>Your scheduled and past consultations.</p>
        </div>
        <button type="button" className="btn btn-primary pg-action" title="Coming soon">+ Book Appointment</button>
      </div>

      <div className="chip-row">
        <button type="button" className={'chip' + (tab === 'upcoming' ? ' active' : '')} onClick={() => setTab('upcoming')}>Upcoming <span className="chip-n">{UPCOMING.length}</span></button>
        <button type="button" className={'chip' + (tab === 'past' ? ' active' : '')} onClick={() => setTab('past')}>Past <span className="chip-n">{PAST.length}</span></button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {list.length
          ? list.map((a, i) => <ApptCard key={i} a={a} past={tab === 'past'} />)
          : <div className="dash-card empty"><p>No {tab} appointments.</p></div>}
      </div>
    </DashboardLayout>
  );
}
