import { useEffect, useState } from 'react';
import { api, rupees } from '../../api.js';
import { Select, DateField, RefreshButton } from '../../components/AdminFields.jsx';

const TYPES = ['Second Opinion', 'New Consultation', 'Follow-up', 'Tumor Board Review', 'Chemotherapy Planning', 'Radiation Planning'];
const STATUSES = ['Pending', 'In Review', 'Report Ready', 'Completed', 'Cancelled'];
const TONE = { Pending: 'amber', 'In Review': 'blue', 'Report Ready': 'teal', Completed: 'green', Cancelled: 'rose' };
const withCurrent = (opts, current) => (current && !opts.some((o) => o.value === current) ? [{ value: current, label: current }, ...opts] : opts);

function ConsultationModal({ item, patients, staff, onClose, onSaved, on401 }) {
  const empty = { patientName: '', patientUhid: '', doctor: '', type: 'Second Opinion', date: '', cancerType: '', summary: '', recommendation: '', status: 'Pending', fee: 0, notes: '' };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  useEffect(() => { setF(item ? { ...empty, ...item } : empty); setErr(''); }, [item]);

  const patientOpts = withCurrent(patients.map((p) => ({ value: p.name, label: p.uhid ? `${p.name} · ${p.uhid}` : p.name })), f.patientName);
  const doctorOpts = withCurrent(staff.map((s) => ({ value: s.name, label: `${s.name} · ${s.role}` })), f.doctor);

  const pickPatient = (v) => {
    const p = patients.find((x) => x.name === v);
    setF({ ...f, patientName: v, patientUhid: p ? (p.uhid || '') : f.patientUhid, cancerType: p && p.cancerType ? p.cancerType : f.cancerType });
  };

  const submit = (e) => {
    e.preventDefault();
    if (!f.patientName) return setErr('Please select a patient.');
    const req = item
      ? api(`/consultations/${item.id}`, { method: 'PUT', on401, body: JSON.stringify(f) })
      : api('/consultations', { method: 'POST', on401, body: JSON.stringify(f) });
    req.then(() => onSaved(item ? 'Consultation updated.' : 'Consultation added.')).catch((ex) => setErr(ex.message));
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-wide">
        <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        <div className="modal-head left"><h3>{item ? 'Edit Consultation' : 'New Consultation'}</h3><p className="modal-sub">Patient &amp; doctor come from your records; diagnosis auto-fills from the patient.</p></div>
        <form className="admin-form" onSubmit={submit}>
          <div className="admin-form-grid">
            <label>Patient *<Select value={f.patientName} onChange={pickPatient} options={patientOpts} placeholder="Select patient" /></label>
            <label>Doctor<Select value={f.doctor} onChange={(v) => setF({ ...f, doctor: v })} options={doctorOpts} placeholder="Select doctor" /></label>
            <label>Type<Select value={f.type} onChange={(v) => setF({ ...f, type: v })} options={TYPES} /></label>
            <label>Status<Select value={f.status} onChange={(v) => setF({ ...f, status: v })} options={STATUSES} /></label>
            <label>Diagnosis<input value={f.cancerType} onChange={set('cancerType')} placeholder="e.g. Colon Cancer" /></label>
            <label>Date<DateField value={f.date} onChange={(v) => setF({ ...f, date: v })} /></label>
            <label>Fee (₹)<input type="number" min="0" value={f.fee} onChange={set('fee')} /></label>
            <label>UHID<input value={f.patientUhid} onChange={set('patientUhid')} placeholder="Auto from patient" /></label>
            <label className="full">Clinical summary / findings<textarea value={f.summary} onChange={set('summary')} placeholder="Staging, history, findings…" /></label>
            <label className="full">Expert recommendation<textarea value={f.recommendation} onChange={set('recommendation')} placeholder="Opinion and recommended plan…" /></label>
            <label className="full">Internal notes<textarea value={f.notes} onChange={set('notes')} placeholder="Notes not shown to the patient…" /></label>
          </div>
          {err && <p className="admin-msg err show">{err}</p>}
          <div className="admin-form-actions"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div>
        </form>
      </div>
    </div>
  );
}

export default function ConsultationsAdmin({ flash, on401 }) {
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
    api('/consultations?' + params.toString(), { on401 })
      .then((d) => { setList(d); setLoading(false); })
      .catch((e) => { flash(e.message, 'err'); setLoading(false); });
  };
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q, status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    api('/patients', { on401 }).then(setPatients).catch(() => {});
    api('/staff', { on401 }).then(setStaff).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const del = (c) => {
    if (!window.confirm(`Delete this consultation for ${c.patientName}?`)) return;
    api(`/consultations/${c.id}`, { method: 'DELETE', on401 }).then(() => { flash('Consultation deleted.'); load(); }).catch((e) => flash(e.message, 'err'));
  };

  return (
    <div className="adm-module">
      <div className="adm-page-head">
        <div><h1>Consultations</h1><p>Clinical encounters &amp; second-opinion cases — {list.length} shown.</p></div>
        <div className="adm-head-actions">
          <RefreshButton onClick={load} />
          <button className="btn btn-primary" onClick={() => setModal(null)}>+ New Consultation</button>
        </div>
      </div>

      <div className="adm-toolbar">
        <div className="adm-search-box">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patient, doctor or diagnosis…" />
        </div>
        <div className="adm-toolbar-filter">
          <Select value={status} onChange={setStatus} options={[{ value: '', label: 'All statuses' }, ...STATUSES.map((s) => ({ value: s, label: s }))]} />
        </div>
      </div>

      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Patient</th><th>Doctor</th><th>Type</th><th>Diagnosis</th><th>Date</th><th>Fee</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan="8" className="admin-empty">Loading…</td></tr>}
              {!loading && list.length === 0 && <tr><td colSpan="8" className="admin-empty">No consultations found.</td></tr>}
              {!loading && list.map((c) => (
                <tr key={c.id}>
                  <td className="t-name">{c.patientName}{c.patientUhid ? <span className="t-sub"> · {c.patientUhid}</span> : ''}</td>
                  <td>{c.doctor || '—'}</td>
                  <td>{c.type}</td>
                  <td>{c.cancerType || '—'}</td>
                  <td>{c.date || '—'}</td>
                  <td>{c.fee ? rupees(c.fee) : '—'}</td>
                  <td><span className={'adm-badge ' + (TONE[c.status] || 'amber')}>{c.status}</span></td>
                  <td><div className="row-actions"><button className="icon-btn" onClick={() => setModal(c)}>Edit</button><button className="icon-btn danger" onClick={() => del(c)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modal !== undefined && <ConsultationModal item={modal} patients={patients} staff={staff} on401={on401} onClose={() => setModal(undefined)} onSaved={(m) => { setModal(undefined); flash(m); load(); }} />}
    </div>
  );
}
