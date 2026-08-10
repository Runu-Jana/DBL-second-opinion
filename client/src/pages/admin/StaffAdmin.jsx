import { useEffect, useState, useRef } from 'react';
import { api } from '../../api.js';
import { Select, DateField, RefreshButton } from '../../components/AdminFields.jsx';
import { CATEGORIES, splitCategories } from '../../lib/categories.js';

const ROLES = ['Oncologist', 'Surgeon', 'Radiologist', 'Clinical Pharmacist', 'Nurse', 'Care Coordinator', 'Nutritionist', 'Lab Technician', 'Administrator', 'Receptionist'];
const DEPARTMENTS = ['Medical Oncology', 'Surgical Oncology', 'Radiation Oncology', 'Pharmacy', 'Nursing', 'Radiology', 'Pathology', 'Patient Support', 'Administration'];
const STATUSES = ['Active', 'On Leave', 'Inactive'];
const TONE = { Active: 'green', 'On Leave': 'amber', Inactive: 'gray' };
const initials = (n = '') => n.replace(/^(Dr|Mr|Ms|Mrs)\.?\s*/i, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

function StaffModal({ member, onClose, onSaved, on401 }) {
  const empty = { name: '', role: '', department: '', specialties: '', qualifications: '', email: '', phone: '', status: 'Active', onCall: false, photoUrl: '', joinedDate: '', bio: '' };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState('');
  const [hint, setHint] = useState('PNG/JPG photo, or paste a URL below.');
  const fileRef = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const cats = splitCategories(f.specialties);
  const toggleCat = (c) => {
    const next = cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c];
    setF((p) => ({ ...p, specialties: next.join(', ') }));
  };
  // Coalesce null DB fields to their empty defaults so inputs stay controlled (no null-value warning).
  useEffect(() => { setF(member ? Object.fromEntries(Object.keys(empty).map((k) => [k, member[k] ?? empty[k]])) : empty); setErr(''); }, [member]); // eslint-disable-line

  const upload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('photo', file); setHint('Uploading…');
    api('/upload', { method: 'POST', body: fd, on401 }).then((r) => { setF((p) => ({ ...p, photoUrl: r.url })); setHint('Uploaded ✓'); })
      .catch((ex) => setHint(ex.message)).finally(() => { e.target.value = ''; });
  };

  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim() || !f.role) return setErr('Name and role are required.');
    const req = member
      ? api(`/staff/${member.id}`, { method: 'PUT', on401, body: JSON.stringify(f) })
      : api('/staff', { method: 'POST', on401, body: JSON.stringify(f) });
    req.then(() => onSaved(member ? 'Staff member updated.' : 'Staff member added.')).catch((ex) => setErr(ex.message));
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-wide">
        <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        <div className="modal-head left"><h3>{member ? 'Edit Staff Member' : 'Add Staff Member'}</h3><p className="modal-sub">Name and role are required.</p></div>
        <form className="admin-form" onSubmit={submit}>
          <div className="admin-form-grid">
            <label>Full name *<input value={f.name} onChange={set('name')} required placeholder="Dr. Full Name" /></label>
            <label>Role *<Select value={f.role} onChange={(v) => setF({ ...f, role: v })} options={ROLES} placeholder="Select role" /></label>
            <label>Department<Select value={f.department} onChange={(v) => setF({ ...f, department: v })} options={DEPARTMENTS} placeholder="Select department" /></label>
            <label>Status<Select value={f.status} onChange={(v) => setF({ ...f, status: v })} options={STATUSES} /></label>
            <label className="full">Qualifications<input value={f.qualifications} onChange={set('qualifications')} placeholder="MBBS, MD, DM (Oncology)" /></label>
            <label>Email<input type="email" value={f.email} onChange={set('email')} placeholder="name@dblinternational.com" /></label>
            <label>Phone<input value={f.phone} onChange={set('phone')} placeholder="+91 …" /></label>
            <label>Joined date<DateField value={f.joinedDate} onChange={(v) => setF({ ...f, joinedDate: v })} /></label>
            <label className="full">Photo
              <div className="photo-field">
                <span className={'photo-preview' + (f.photoUrl ? ' has-img' : '')} style={f.photoUrl ? { backgroundImage: `url("${f.photoUrl}")` } : undefined} aria-hidden="true" />
                <div className="photo-controls">
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={upload} />
                  <button type="button" className="btn-ghost sm" onClick={() => fileRef.current.click()}>Upload image</button>
                  {f.photoUrl && <button type="button" className="btn-ghost sm" onClick={() => setF({ ...f, photoUrl: '' })}>Remove</button>}
                  <span className="photo-hint">{hint}</span>
                </div>
              </div>
              <input value={f.photoUrl} onChange={set('photoUrl')} placeholder="https://… (or upload above)" />
            </label>
            <div className="full adm-cat-field">
              <span className="adm-cat-label">Report categories handled <em>— patient reports of these types are round-robin routed to this doctor (needs a portal login)</em></span>
              <div className="adm-cat-checks">
                {CATEGORIES.map((c) => (
                  <button type="button" key={c} className={'adm-cat-chip' + (cats.includes(c) ? ' on' : '')} onClick={() => toggleCat(c)}>
                    {cats.includes(c) && <span className="adm-cat-tick" aria-hidden="true">✓ </span>}{c}
                  </button>
                ))}
              </div>
            </div>
            <label className="full">Short bio<textarea value={f.bio} onChange={set('bio')} placeholder="A sentence or two…" /></label>
            <div className="full checks">
              <label><input type="checkbox" checked={f.onCall} onChange={set('onCall')} /> On call today</label>
            </div>
          </div>
          {err && <p className="admin-msg err show">{err}</p>}
          <div className="admin-form-actions"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div>
        </form>
      </div>
    </div>
  );
}

export default function StaffAdmin({ flash, on401 }) {
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(undefined);
  const [loading, setLoading] = useState(true);

  const load = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (status) params.set('status', status);
    setLoading(true);
    api('/staff?' + params.toString(), { on401 })
      .then((d) => { setList(d); setLoading(false); })
      .catch((e) => { flash(e.message, 'err'); setLoading(false); });
  };
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const del = (m) => {
    if (!window.confirm(`Delete ${m.name}? This cannot be undone.`)) return;
    api(`/staff/${m.id}`, { method: 'DELETE', on401 }).then(() => { flash('Staff member deleted.'); load(); }).catch((e) => flash(e.message, 'err'));
  };

  return (
    <div className="adm-module">
      <div className="adm-page-head">
        <div><h1>Doctor &amp; Staff Management</h1><p>Manage doctors, nurses and support staff — {list.length} shown.</p></div>
        <div className="adm-head-actions">
          <RefreshButton onClick={load} />
          <button className="btn btn-primary" onClick={() => setModal(null)}>+ Add Staff</button>
        </div>
      </div>

      <div className="adm-toolbar">
        <div className="adm-search-box">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, role or department…" />
        </div>
        <div className="adm-toolbar-filter">
          <Select value={status} onChange={setStatus} options={[{ value: '', label: 'All statuses' }, ...STATUSES.map((s) => ({ value: s, label: s }))]} />
        </div>
      </div>

      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Staff Member</th><th>Department</th><th>Email</th><th>Phone</th><th>Status</th><th>On Call</th><th></th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan="7" className="admin-empty">Loading…</td></tr>}
              {!loading && list.length === 0 && <tr><td colSpan="7" className="admin-empty">No staff found.</td></tr>}
              {!loading && list.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="adm-cell-user">
                      <span className="adm-mini-avatar sm" style={m.photoUrl ? { backgroundImage: `url("${m.photoUrl}")`, backgroundSize: 'cover' } : undefined}>{m.photoUrl ? '' : initials(m.name)}</span>
                      <span className="adm-cell-user-meta"><strong>{m.name}</strong><span>{m.role}</span></span>
                    </div>
                  </td>
                  <td>
                    {m.department || '—'}
                    {m.specialties && <div className="adm-cell-cats">{splitCategories(m.specialties).map((c) => <span key={c} className="adm-cat-tag">{c}</span>)}</div>}
                  </td>
                  <td>{m.email || '—'}</td>
                  <td>{m.phone || '—'}</td>
                  <td><span className={'adm-badge ' + (TONE[m.status] || 'gray')}>{m.status}</span></td>
                  <td>{m.onCall ? <span className="adm-badge teal">On call</span> : '—'}</td>
                  <td><div className="row-actions"><button className="icon-btn" onClick={() => setModal(m)}>Edit</button><button className="icon-btn danger" onClick={() => del(m)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modal !== undefined && <StaffModal member={modal} on401={on401} onClose={() => setModal(undefined)} onSaved={(m) => { setModal(undefined); flash(m); load(); }} />}
    </div>
  );
}
