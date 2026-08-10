import { useState, useEffect } from 'react';
import { Select } from '../components/AdminFields.jsx';
import { CATEGORY_TONE } from '../lib/categories.js';

const DTOK = 'dbl_doctor_token';
const REPORT_STATUSES = ['Pending Review', 'Reviewed', 'Uploaded', 'Archived'];
const RTONE = { 'Pending Review': 'amber', Reviewed: 'green', Uploaded: 'blue', Archived: 'gray' };
const PTONE = { 'New Patient': 'blue', 'Under Treatment': 'teal', 'Follow-up': 'amber', Completed: 'green', Discharged: 'gray' };
const initials = (n = '') => n.replace(/^(Dr|Mr|Ms|Mrs)\.?\s*/i, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

async function docApi(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem(DTOK);
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch('/api' + path, { ...opts, headers });
  let body = {};
  try { body = await res.json(); } catch { /* empty */ }
  if (!res.ok) throw new Error(body.error || 'Request failed.');
  return body;
}

const Shield = (
  <svg viewBox="5 2 22 28" width="30" height="38" aria-hidden="true">
    <path d="M16 3 26.5 6.2V13.8C26.5 21.2 21.9 26.2 16 29 10.1 26.2 5.5 21.2 5.5 13.8V6.2Z" fill="#12b3a0" />
    <rect x="14.3" y="9.6" width="3.4" height="11" rx="1" fill="#fff" />
    <rect x="10.5" y="13.4" width="11" height="3.4" rx="1" fill="#fff" />
  </svg>
);

function DoctorLogin({ onLogin }) {
  const [err, setErr] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const email = e.target.email.value.trim().toLowerCase();
    const password = e.target.password.value;
    docApi('/auth/doctor-login', { method: 'POST', body: JSON.stringify({ email, password }) })
      .then((r) => { localStorage.setItem(DTOK, r.token); onLogin(r.token); })
      .catch((ex) => setErr(ex.message));
  };
  return (
    <div className="doc-login-wrap">
      <form className="doc-login" onSubmit={submit}>
        <span className="doc-login-mark">{Shield}</span>
        <h1>Doctor Portal</h1>
        <p>Sign in to review reports assigned to you.</p>
        <label>Email<input type="email" name="email" autoComplete="username" placeholder="you@dblinternational.com" required /></label>
        <label>Password<input type="password" name="password" autoComplete="current-password" placeholder="Your password" required /></label>
        {err && <p className="doc-err">{err}</p>}
        <button type="submit" className="btn btn-primary btn-block">Log in</button>
      </form>
    </div>
  );
}

function DoctorDashboard({ onLogout }) {
  const [me, setMe] = useState(null);
  const [reports, setReports] = useState([]);
  const [patients, setPatients] = useState([]);
  const [msg, setMsg] = useState('');

  const load = () => {
    docApi('/doctor/me').then(setMe).catch(() => onLogout());
    docApi('/doctor/reports').then(setReports).catch(() => {});
    docApi('/doctor/patients').then(setPatients).catch(() => {});
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changeStatus = (r, status) => {
    docApi(`/doctor/reports/${r.id}`, { method: 'PUT', body: JSON.stringify({ status }) })
      .then(() => { setMsg('Report status updated.'); load(); setTimeout(() => setMsg(''), 2500); })
      .catch((e) => setMsg(e.message));
  };

  const name = me?.doctor?.name || 'Doctor';
  const stats = me?.stats || { patients: 0, pendingReports: 0, totalReports: 0 };

  return (
    <div className="doc-shell">
      <header className="doc-topbar">
        <div className="doc-brand">{Shield}<span className="doc-brand-text"><strong>DBL Doctor Portal</strong><span>{me?.doctor?.department || 'Oncology'}</span></span></div>
        <div className="doc-user">
          <span className="doc-user-avatar">{initials(name)}</span>
          <span className="doc-user-meta"><strong>{name}</strong><span>{me?.doctor?.role || 'Doctor'}</span></span>
          <button type="button" className="doc-logout" onClick={onLogout}>Log out</button>
        </div>
      </header>

      <main className="doc-main">
        <div className="doc-welcome"><h1>Welcome, {name} <span role="img" aria-label="wave">👋</span></h1><p>Here are the patients and reports assigned to you.</p></div>
        {msg && <p className="doc-flash">{msg}</p>}

        <div className="doc-stats">
          <div className="adm-stat"><span className="adm-stat-label">My Patients</span><strong className="adm-stat-value">{stats.patients}</strong></div>
          <div className="adm-stat"><span className="adm-stat-label">Reports Pending Review</span><strong className="adm-stat-value">{stats.pendingReports}</strong></div>
          <div className="adm-stat"><span className="adm-stat-label">Total Reports</span><strong className="adm-stat-value">{stats.totalReports}</strong></div>
        </div>

        <section className="adm-card">
          <div className="adm-card-head"><h2>Reports to Review</h2></div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Patient</th><th>Type</th><th>Category</th><th>Date</th><th>File</th><th>Status</th><th>Update</th></tr></thead>
              <tbody>
                {reports.length === 0 && <tr><td colSpan="7" className="admin-empty">No reports assigned to you yet.</td></tr>}
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td className="t-name">{r.patientName}{r.patientUhid ? <span className="t-sub"> · {r.patientUhid}</span> : ''}</td>
                    <td>{r.type}</td>
                    <td>{r.category ? <span className={'adm-badge ' + (CATEGORY_TONE[r.category] || 'gray')}>{r.category}</span> : '—'}</td>
                    <td>{r.date || '—'}</td>
                    <td>{r.fileUrl ? <a className="adm-link" href={r.fileUrl} target="_blank" rel="noreferrer">View</a> : '—'}</td>
                    <td><span className={'adm-badge ' + (RTONE[r.status] || 'blue')}>{r.status}</span></td>
                    <td style={{ minWidth: 170 }}><Select value={r.status} onChange={(v) => changeStatus(r, v)} options={REPORT_STATUSES} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="adm-card">
          <div className="adm-card-head"><h2>My Patients</h2></div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Patient</th><th>UHID</th><th>Cancer Type</th><th>Stage</th><th>Status</th><th>Last Visit</th></tr></thead>
              <tbody>
                {patients.length === 0 && <tr><td colSpan="6" className="admin-empty">No patients assigned to you yet.</td></tr>}
                {patients.map((p) => (
                  <tr key={p.id}>
                    <td className="t-name">{p.name}</td>
                    <td className="mono">{p.uhid}</td>
                    <td>{p.cancerType || '—'}</td>
                    <td>{p.stage || '—'}</td>
                    <td><span className={'adm-badge ' + (PTONE[p.status] || 'blue')}>{p.status}</span></td>
                    <td>{p.lastVisit || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function DoctorPortal() {
  const [token, setToken] = useState(() => localStorage.getItem(DTOK));
  useEffect(() => { document.title = 'Doctor Portal — DBL International'; }, []);
  const logout = () => { localStorage.removeItem(DTOK); setToken(null); };
  if (!token) return <DoctorLogin onLogin={setToken} />;
  return <DoctorDashboard onLogout={logout} />;
}
