import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Select, RefreshButton } from '../../components/AdminFields.jsx';

const STATUSES = ['Pending', 'Approved', 'Rejected'];
const TONE = { Pending: 'amber', Approved: 'green', Rejected: 'rose' };

export default function ApplicationsAdmin({ flash, on401 }) {
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (status) params.set('status', status);
    setLoading(true);
    api('/doctor-applications?' + params.toString(), { on401 })
      .then((d) => { setList(d); setLoading(false); })
      .catch((e) => { flash(e.message, 'err'); setLoading(false); });
  };
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q, status]); // eslint-disable-line

  const approve = (a) => {
    if (!window.confirm(`Approve ${a.name}? This creates a doctor login and a public oncologist listing.`)) return;
    api(`/doctor-applications/${a.id}/approve`, { method: 'POST', on401 })
      .then((r) => { flash(r.login ? `Approved. Login created: ${r.login.email} / ${r.login.password}` : 'Approved. Doctor account already existed.'); load(); })
      .catch((e) => flash(e.message, 'err'));
  };
  const reject = (a) => {
    api(`/doctor-applications/${a.id}`, { method: 'PUT', on401, body: JSON.stringify({ status: 'Rejected' }) })
      .then(() => { flash('Application rejected.'); load(); }).catch((e) => flash(e.message, 'err'));
  };
  const del = (a) => {
    if (!window.confirm(`Delete ${a.name}'s application? This cannot be undone.`)) return;
    api(`/doctor-applications/${a.id}`, { method: 'DELETE', on401 }).then(() => { flash('Application deleted.'); load(); }).catch((e) => flash(e.message, 'err'));
  };

  return (
    <div className="adm-module">
      <div className="adm-page-head">
        <div><h1>Doctor Applications</h1><p>Applications from the “Join Our Network” form — {list.length} shown.</p></div>
        <RefreshButton onClick={load} />
      </div>

      <div className="adm-toolbar">
        <div className="adm-search-box">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or specialization…" />
        </div>
        <div className="adm-toolbar-filter">
          <Select value={status} onChange={setStatus} options={[{ value: '', label: 'All statuses' }, ...STATUSES.map((s) => ({ value: s, label: s }))]} />
        </div>
      </div>

      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Applicant</th><th>Reg. No</th><th>Specialization</th><th>Experience</th><th>Qualification</th><th>Country</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan="8" className="admin-empty">Loading…</td></tr>}
              {!loading && list.length === 0 && <tr><td colSpan="8" className="admin-empty">No applications yet.</td></tr>}
              {!loading && list.map((a) => (
                <tr key={a.id}>
                  <td className="t-name" title={a.about || ''}>{a.name}<span className="t-sub"> · {a.email}{a.phone ? ' · ' + a.phone : ''}</span></td>
                  <td>{a.registrationNo || '—'}</td>
                  <td>{a.specialization || '—'}</td>
                  <td>{a.experience || '—'}</td>
                  <td>{a.qualification || '—'}</td>
                  <td>{a.country || '—'}</td>
                  <td><span className={'adm-badge ' + (TONE[a.status] || 'gray')}>{a.status}</span></td>
                  <td>
                    <div className="row-actions">
                      {a.status === 'Pending' && <button className="icon-btn ok" onClick={() => approve(a)}>Approve</button>}
                      {a.status === 'Pending' && <button className="icon-btn" onClick={() => reject(a)}>Reject</button>}
                      <button className="icon-btn danger" onClick={() => del(a)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
