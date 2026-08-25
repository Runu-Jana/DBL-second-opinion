import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { patientApi } from '../api.js';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Ico = {
  video: <svg viewBox="0 0 24 24" width="15" height="15" {...s}><rect x="3" y="6" width="12" height="12" rx="2" /><path d="m15 10 6-3v10l-6-3Z" /></svg>,
  clock: <svg viewBox="0 0 24 24" width="15" height="15" {...s}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  plus: <svg viewBox="0 0 24 24" width="16" height="16" {...s}><path d="M12 5v14M5 12h14" /></svg>,
};
const PAST_STATUS = ['Completed', 'Cancelled'];

// Booking time slots (09:00 AM → 06:00 PM, every 30 min).
const TIMES = (() => {
  const out = [];
  for (let h = 9; h <= 18; h++) {
    for (const m of ['00', '30']) {
      if (h === 18 && m === '30') break;
      const ap = h < 12 ? 'AM' : 'PM';
      const hh = ((h + 11) % 12) + 1;
      out.push(`${String(hh).padStart(2, '0')}:${m} ${ap}`);
    }
  }
  return out;
})();
const TYPES = ['Second Opinion Consultation', 'Follow-up', 'Report Review', 'Treatment Discussion'];
const todayISO = () => new Date().toISOString().slice(0, 10);

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

const emptyForm = { doctor: '', type: TYPES[0], mode: 'Video', date: '', time: '', reason: '' };

function BookForm({ doctors, onCancel, onBooked }) {
  const [f, setF] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    setErr('');
    if (!f.date) return setErr('Please choose a date.');
    if (!f.time) return setErr('Please choose a time.');
    setBusy(true);
    patientApi('/portal/appointments', { method: 'POST', body: JSON.stringify(f) })
      .then((created) => onBooked(created))
      .catch((ex) => setErr(ex.message))
      .finally(() => setBusy(false));
  };

  return (
    <form className="dash-card" onSubmit={submit} style={{ marginBottom: '1.2rem' }}>
      <div className="dash-card-head"><h2>Request an Appointment</h2></div>
      <div className="pf-grid">
        <label className="pf-field"><span>Doctor <span className="pf-opt">(optional)</span></span>
          <select value={f.doctor} onChange={set('doctor')}>
            <option value="">No preference — assign a specialist</option>
            {doctors.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="pf-field"><span>Consultation type</span>
          <select value={f.type} onChange={set('type')}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        </label>
        <label className="pf-field"><span>Mode</span>
          <select value={f.mode} onChange={set('mode')}><option value="Video">Video call</option><option value="In-person">In-person</option></select>
        </label>
        <label className="pf-field"><span>Preferred date <span className="pf-req">*</span></span>
          <input type="date" value={f.date} min={todayISO()} onChange={set('date')} required />
        </label>
        <label className="pf-field"><span>Preferred time <span className="pf-req">*</span></span>
          <select value={f.time} onChange={set('time')} required>
            <option value="" disabled>Select a time…</option>
            {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="pf-field" style={{ gridColumn: '1 / -1' }}><span>Reason / notes <span className="pf-opt">(optional)</span></span>
          <textarea value={f.reason} onChange={set('reason')} rows={3} placeholder="Briefly, what would you like to discuss?" />
        </label>
      </div>
      {err && <p className="admin-msg err show" style={{ marginTop: '.6rem' }}>{err}</p>}
      <p style={{ margin: '.7rem 0 0', fontSize: '.78rem', color: 'var(--muted)' }}>Your request is sent to our care team — they'll confirm the slot and share a meeting link.</p>
      <div style={{ display: 'flex', gap: '.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Request appointment'}</button>
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}

export default function Appointments() {
  const [tab, setTab] = useState('upcoming');
  const [appts, setAppts] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [booking, setBooking] = useState(false);
  const [notice, setNotice] = useState('');

  const load = () => patientApi('/portal/appointments').then(setAppts).catch(() => setAppts([]));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    patientApi('/oncologists')
      .then((list) => setDoctors(Array.isArray(list) ? list.map((d) => d.name).filter(Boolean) : []))
      .catch(() => setDoctors([]));
  }, []);

  const onBooked = () => {
    setBooking(false);
    setNotice('Appointment requested — our care team will confirm your slot shortly.');
    setTab('upcoming');
    load();
    setTimeout(() => setNotice(''), 6000);
  };

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
        {!booking && (
          <button type="button" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem' }} onClick={() => { setBooking(true); setNotice(''); }}>
            {Ico.plus} Book Appointment
          </button>
        )}
      </div>

      {notice && <p className="admin-msg ok show" style={{ marginBottom: '1rem' }}>{notice}</p>}

      {booking && <BookForm doctors={doctors} onCancel={() => setBooking(false)} onBooked={onBooked} />}

      <div className="chip-row">
        <button type="button" className={'chip' + (tab === 'upcoming' ? ' active' : '')} onClick={() => setTab('upcoming')}>Upcoming <span className="chip-n">{upcoming.length}</span></button>
        <button type="button" className={'chip' + (tab === 'past' ? ' active' : '')} onClick={() => setTab('past')}>Past <span className="chip-n">{past.length}</span></button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {appts === null
          ? <div className="dash-card empty"><p>Loading…</p></div>
          : list.length
            ? list.map((a) => <ApptCard key={a.id} a={a} past={tab === 'past'} />)
            : <div className="dash-card empty"><p>No {tab} appointments.{tab === 'upcoming' ? ' Use “Book Appointment” above to request a consultation.' : ''}</p></div>}
      </div>
    </DashboardLayout>
  );
}
