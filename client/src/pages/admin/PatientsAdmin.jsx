import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Select, DateField, RefreshButton } from '../../components/AdminFields.jsx';

const STATUSES = ['New Patient', 'Under Treatment', 'Follow-up', 'Completed', 'Discharged'];
const GENDERS = ['Male', 'Female', 'Other'];
const TONE = { 'New Patient': 'blue', 'Under Treatment': 'teal', 'Follow-up': 'amber', Completed: 'green', Discharged: 'gray' };

function PatientModal({ patient, onClose, onSaved, on401 }) {
  const empty = { name: '', uhid: '', age: '', gender: '', phone: '', email: '', city: '', cancerType: '', stage: '', status: 'New Patient', doctor: '', lastVisit: '', notes: '' };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  useEffect(() => { setF(patient ? { ...empty, ...patient, age: patient.age ?? '' } : empty); setErr(''); }, [patient]);

  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return setErr('Patient name is required.');
    const req = patient
      ? api(`/patients/${patient.id}`, { method: 'PUT', on401, body: JSON.stringify(f) })
      : api('/patients', { method: 'POST', on401, body: JSON.stringify(f) });
    req.then(() => onSaved(patient ? 'Patient updated.' : 'Patient added.')).catch((ex) => setErr(ex.message));
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-wide">
        <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        <div className="modal-head left"><h3>{patient ? 'Edit Patient' : 'Add Patient'}</h3><p className="modal-sub">UHID is generated automatically if left blank.</p></div>
        <form className="admin-form" onSubmit={submit}>
          <div className="admin-form-grid">
            <label>Full name *<input value={f.name} onChange={set('name')} required placeholder="Patient name" /></label>
            <label>UHID<input value={f.uhid} onChange={set('uhid')} placeholder="Auto (DBL######)" /></label>
            <label>Age<input type="number" min="0" value={f.age} onChange={set('age')} placeholder="e.g. 54" /></label>
            <label>Gender<Select value={f.gender} onChange={(v) => setF({ ...f, gender: v })} options={GENDERS} placeholder="Select gender" /></label>
            <label>Phone<input value={f.phone} onChange={set('phone')} placeholder="+91 …" /></label>
            <label>Email<input type="email" value={f.email} onChange={set('email')} placeholder="name@example.com" /></label>
            <label>City<input value={f.city} onChange={set('city')} placeholder="Mumbai" /></label>
            <label>Cancer type<input value={f.cancerType} onChange={set('cancerType')} placeholder="e.g. Colon Cancer" /></label>
            <label>Stage<input value={f.stage} onChange={set('stage')} placeholder="e.g. Stage II" /></label>
            <label>Status<Select value={f.status} onChange={(v) => setF({ ...f, status: v })} options={STATUSES} /></label>
            <label>Assigned doctor<input value={f.doctor} onChange={set('doctor')} placeholder="Dr. …" /></label>
            <label>Last visit<DateField value={f.lastVisit} onChange={(v) => setF({ ...f, lastVisit: v })} /></label>
            <label className="full">Notes<textarea value={f.notes} onChange={set('notes')} placeholder="Clinical notes, history…" /></label>
          </div>
          {err && <p className="admin-msg err show">{err}</p>}
          <div className="admin-form-actions"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div>
        </form>
      </div>
    </div>
  );
}

export default function PatientsAdmin({ flash, on401 }) {
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(undefined); // undefined=closed, null=new, obj=edit
  const [loading, setLoading] = useState(true);

  const load = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (status) params.set('status', status);
    setLoading(true);
    api('/patients?' + params.toString(), { on401 })
      .then((d) => { setList(d); setLoading(false); })
      .catch((e) => { flash(e.message, 'err'); setLoading(false); });
  };
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const del = (p) => {
    if (!window.confirm(`Delete ${p.name}? This cannot be undone.`)) return;
    api(`/patients/${p.id}`, { method: 'DELETE', on401 }).then(() => { flash('Patient deleted.'); load(); }).catch((e) => flash(e.message, 'err'));
  };

  return (
    <div className="adm-module">
      <div className="adm-page-head">
        <div><h1>Patient Management</h1><p>Manage patient records — {list.length} shown.</p></div>
        <div className="adm-head-actions">
          <RefreshButton onClick={load} />
          <button className="btn btn-primary" onClick={() => setModal(null)}>+ Add Patient</button>
        </div>
      </div>

      <div className="adm-toolbar">
        <div className="adm-search-box">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, UHID or cancer type…" />
        </div>
        <div className="adm-toolbar-filter">
          <Select value={status} onChange={setStatus} options={[{ value: '', label: 'All statuses' }, ...STATUSES.map((s) => ({ value: s, label: s }))]} />
        </div>
      </div>

      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Patient</th><th>UHID</th><th>Cancer Type</th><th>Stage</th><th>Status</th><th>Doctor</th><th>Last Visit</th><th></th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan="8" className="admin-empty">Loading…</td></tr>}
              {!loading && list.length === 0 && <tr><td colSpan="8" className="admin-empty">No patients found.</td></tr>}
              {!loading && list.map((p) => (
                <tr key={p.id}>
                  <td className="t-name">{p.name}{p.age ? <span className="t-sub"> · {p.age}{p.gender ? `, ${p.gender}` : ''}</span> : ''}</td>
                  <td className="mono">{p.uhid}</td>
                  <td>{p.cancerType || '—'}</td>
                  <td>{p.stage || '—'}</td>
                  <td><span className={'adm-badge ' + (TONE[p.status] || 'blue')}>{p.status}</span></td>
                  <td>{p.doctor || '—'}</td>
                  <td>{p.lastVisit || '—'}</td>
                  <td><div className="row-actions"><button className="icon-btn" onClick={() => setModal(p)}>Edit</button><button className="icon-btn danger" onClick={() => del(p)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modal !== undefined && <PatientModal patient={modal} on401={on401} onClose={() => setModal(undefined)} onSaved={(m) => { setModal(undefined); flash(m); load(); }} />}
    </div>
  );
}
