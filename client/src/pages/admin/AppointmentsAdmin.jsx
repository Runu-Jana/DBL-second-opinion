import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Select, DateField, RefreshButton } from '../../components/AdminFields.jsx';

const TYPES = ['New Consultation', 'OPD Follow-up', 'Second Opinion', 'Chemotherapy Review', 'Treatment Plan Review', 'Radiation Review', 'Video Consultation'];
const TIMES = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM'];
const MODES = ['In-person', 'Video'];
const STATUSES = ['Upcoming', 'Confirmed', 'Pending', 'Completed', 'Cancelled'];
const TONE = { Upcoming: 'blue', Confirmed: 'green', Pending: 'amber', Completed: 'teal', Cancelled: 'rose' };

// build Select options, injecting `current` if it isn't already present (so editing survives deletions)
const withCurrent = (opts, current) => (current && !opts.some((o) => o.value === current) ? [{ value: current, label: current }, ...opts] : opts);

function AppointmentModal({ appt, patients, staff, onClose, onSaved, on401 }) {
  const empty = { patientName: '', patientUhid: '', doctor: '', type: 'New Consultation', date: '', time: '', mode: 'In-person', status: 'Upcoming', notes: '' };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  useEffect(() => { setF(appt ? { ...empty, ...appt } : empty); setErr(''); }, [appt]);

  const patientOpts = withCurrent(patients.map((p) => ({ value: p.name, label: p.uhid ? `${p.name} · ${p.uhid}` : p.name })), f.patientName);
  const doctorOpts = withCurrent(staff.map((s) => ({ value: s.name, label: `${s.name} · ${s.role}` })), f.doctor);

  const pickPatient = (v) => { const p = patients.find((x) => x.name === v); setF({ ...f, patientName: v, patientUhid: p ? (p.uhid || '') : f.patientUhid }); };

  const submit = (e) => {
    e.preventDefault();
    if (!f.patientName) return setErr('Please select a patient.');
    const req = appt
      ? api(`/appointments/${appt.id}`, { method: 'PUT', on401, body: JSON.stringify(f) })
      : api('/appointments', { method: 'POST', on401, body: JSON.stringify(f) });
    req.then(() => onSaved(appt ? 'Appointment updated.' : 'Appointment scheduled.')).catch((ex) => setErr(ex.message));
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-wide">
        <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        <div className="modal-head left"><h3>{appt ? 'Edit Appointment' : 'Schedule Appointment'}</h3><p className="modal-sub">Patient and doctor lists come from your records.</p></div>
        <form className="admin-form" onSubmit={submit}>
          <div className="admin-form-grid">
            <label>Patient *<Select value={f.patientName} onChange={pickPatient} options={patientOpts} placeholder="Select patient" /></label>
            <label>Doctor<Select value={f.doctor} onChange={(v) => setF({ ...f, doctor: v })} options={doctorOpts} placeholder="Select doctor" /></label>
            <label>Type<Select value={f.type} onChange={(v) => setF({ ...f, type: v })} options={TYPES} /></label>
            <label>Mode<Select value={f.mode} onChange={(v) => setF({ ...f, mode: v })} options={MODES} /></label>
            <label>Date<DateField value={f.date} onChange={(v) => setF({ ...f, date: v })} /></label>
            <label>Time<Select value={f.time} onChange={(v) => setF({ ...f, time: v })} options={TIMES} placeholder="Select time" /></label>
            <label>Status<Select value={f.status} onChange={(v) => setF({ ...f, status: v })} options={STATUSES} /></label>
            <label>UHID<input value={f.patientUhid} onChange={set('patientUhid')} placeholder="Auto from patient" /></label>
            <label className="full">Notes<textarea value={f.notes} onChange={set('notes')} placeholder="Reason, instructions…" /></label>
          </div>
          {err && <p className="admin-msg err show">{err}</p>}
          <div className="admin-form-actions"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div>
        </form>
      </div>
    </div>
  );
}

export default function AppointmentsAdmin({ flash, on401 }) {
  const [list, setList] = useState([]);
  const [patients, setPatients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(undefined);
  const [loading, setLoading] = useState(true);

  const load = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (status) params.set('status', status);
    setLoading(true);
    api('/appointments?' + params.toString(), { on401 })
      .then((d) => { setList(d); setLoading(false); })
      .catch((e) => { flash(e.message, 'err'); setLoading(false); });
  };
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q, status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    api('/patients', { on401 }).then(setPatients).catch(() => {});
    api('/staff', { on401 }).then(setStaff).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const del = (a) => {
    if (!window.confirm(`Delete this appointment for ${a.patientName}?`)) return;
    api(`/appointments/${a.id}`, { method: 'DELETE', on401 }).then(() => { flash('Appointment deleted.'); load(); }).catch((e) => flash(e.message, 'err'));
  };

  return (
    <div className="adm-module">
      <div className="adm-page-head">
        <div><h1>Appointments</h1><p>Schedule and manage appointments — {list.length} shown.</p></div>
        <div className="adm-head-actions">
          <RefreshButton onClick={load} />
          <button className="btn btn-primary" onClick={() => setModal(null)}>+ Schedule Appointment</button>
        </div>
      </div>

      <div className="adm-toolbar">
        <div className="adm-search-box">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patient, doctor or type…" />
        </div>
        <div className="adm-toolbar-filter">
          <Select value={status} onChange={setStatus} options={[{ value: '', label: 'All statuses' }, ...STATUSES.map((s) => ({ value: s, label: s }))]} />
        </div>
      </div>

      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Patient</th><th>Doctor</th><th>Type</th><th>Date &amp; Time</th><th>Mode</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan="7" className="admin-empty">Loading…</td></tr>}
              {!loading && list.length === 0 && <tr><td colSpan="7" className="admin-empty">No appointments found.</td></tr>}
              {!loading && list.map((a) => (
                <tr key={a.id}>
                  <td className="t-name">{a.patientName}{a.patientUhid ? <span className="t-sub"> · {a.patientUhid}</span> : ''}</td>
                  <td>{a.doctor || '—'}</td>
                  <td>{a.type}</td>
                  <td>{a.date || '—'}{a.time ? <span className="t-sub"> · {a.time}</span> : ''}</td>
                  <td>{a.mode === 'Video' ? <span className="adm-badge teal">Video</span> : <span className="adm-badge gray">In-person</span>}</td>
                  <td><span className={'adm-badge ' + (TONE[a.status] || 'blue')}>{a.status}</span></td>
                  <td><div className="row-actions"><button className="icon-btn" onClick={() => setModal(a)}>Edit</button><button className="icon-btn danger" onClick={() => del(a)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modal !== undefined && <AppointmentModal appt={modal} patients={patients} staff={staff} on401={on401} onClose={() => setModal(undefined)} onSaved={(m) => { setModal(undefined); flash(m); load(); }} />}
    </div>
  );
}
