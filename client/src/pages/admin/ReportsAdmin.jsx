import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Select, RefreshButton } from '../../components/AdminFields.jsx';
import { CATEGORIES, CATEGORY_TONE } from '../../lib/categories.js';

const STATUSES = ['Pending Review', 'Reviewed', 'Uploaded', 'Archived'];
const STONE = { 'Pending Review': 'amber', Reviewed: 'green', Uploaded: 'blue', Archived: 'gray' };
const UNTRIAGED = '__untriaged__';

const TagIcon = (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7v5.5a2 2 0 0 0 .6 1.4l7 7a2 2 0 0 0 2.8 0l5.5-5.5a2 2 0 0 0 0-2.8l-7-7A2 2 0 0 0 12.5 5H7a4 4 0 0 0-4 4Z" /><circle cx="8.5" cy="9.5" r="1.3" />
  </svg>
);

/* ---------- Triage modal: pick a category, auto-route to the least-loaded specialist ---------- */
function TriageModal({ report, onClose, onDone, on401 }) {
  const [category, setCategory] = useState(report.category || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = () => {
    if (!category) return setErr('Pick a category to route this report.');
    setBusy(true); setErr('');
    api(`/reports/${report.id}/categorise`, { method: 'POST', on401, body: JSON.stringify({ category }) })
      .then((res) => onDone(res))
      .catch((e) => { setErr(e.message); setBusy(false); });
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        <div className="modal-head left">
          <h3>{report.category ? 'Re-triage report' : 'Triage report'}</h3>
          <p className="modal-sub">{report.patientName}{report.patientUhid ? ` · ${report.patientUhid}` : ''} — {report.type}</p>
        </div>

        <div className="triage-body">
          {report.fileUrl
            ? <a className="triage-file" href={report.fileUrl} target="_blank" rel="noreferrer">{TagIcon}<span>Open the report file</span><span aria-hidden="true">↗</span></a>
            : <span className="triage-file muted">No file attached</span>}

          <span className="adm-cat-label">Choose a category</span>
          <div className="adm-cat-checks">
            {CATEGORIES.map((c) => (
              <button type="button" key={c} className={'adm-cat-chip' + (category === c ? ' on' : '')} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>
          <p className="triage-note">The report is routed automatically to the least-loaded specialist tagged for this category.</p>
          {err && <p className="admin-msg err show">{err}</p>}
        </div>

        <div className="admin-form-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? 'Routing…' : 'Categorise & route'}</button>
        </div>
      </div>
    </div>
  );
}

export default function ReportsAdmin({ flash, on401 }) {
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [cat, setCat] = useState(''); // '' = all, UNTRIAGED = awaiting triage, else a category
  const [loading, setLoading] = useState(true);
  const [triage, setTriage] = useState(null); // report being triaged

  const load = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (status) params.set('status', status);
    setLoading(true);
    api('/reports?' + params.toString(), { on401 })
      .then((d) => { setList(d); setLoading(false); })
      .catch((e) => { flash(e.message, 'err'); setLoading(false); });
  };
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q, status]); // eslint-disable-line

  const shown = list.filter((r) => {
    if (cat === '') return true;
    if (cat === UNTRIAGED) return !r.category;
    return r.category === cat;
  });
  const untriagedCount = list.filter((r) => !r.category).length;

  const onTriageDone = (res) => {
    if (res.assignedTo) flash(`Categorised as “${res.category}” · routed to ${res.assignedTo}.`);
    else flash(`Categorised as “${res.category}”, but no specialist is tagged for it yet — set one in Doctor & Staff Management.`, 'err');
    setTriage(null); load();
  };

  const del = (r) => {
    if (!window.confirm(`Delete this report for ${r.patientName}? This cannot be undone.`)) return;
    api(`/reports/${r.id}`, { method: 'DELETE', on401 }).then(() => { flash('Report deleted.'); load(); }).catch((e) => flash(e.message, 'err'));
  };

  const catOptions = [
    { value: '', label: 'All categories' },
    { value: UNTRIAGED, label: `Awaiting triage${untriagedCount ? ` (${untriagedCount})` : ''}` },
    ...CATEGORIES.map((c) => ({ value: c, label: c })),
  ];

  return (
    <div className="adm-module">
      <div className="adm-page-head">
        <div><h1>Reports Management</h1><p>Triage patient uploads and route each to the right specialist — {shown.length} shown.</p></div>
        <RefreshButton onClick={load} />
      </div>

      {untriagedCount > 0 && (
        <button type="button" className={'adm-triage-banner' + (cat === UNTRIAGED ? ' active' : '')} onClick={() => setCat(cat === UNTRIAGED ? '' : UNTRIAGED)}>
          <span className="adm-triage-dot" />
          <strong>{untriagedCount}</strong> report{untriagedCount > 1 ? 's' : ''} awaiting triage — set a category to route {untriagedCount > 1 ? 'them' : 'it'} to a specialist.
        </button>
      )}

      <div className="adm-toolbar">
        <div className="adm-search-box">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patient, type, category or doctor…" />
        </div>
        <div className="adm-toolbar-filter">
          <Select value={cat} onChange={setCat} options={catOptions} />
        </div>
        <div className="adm-toolbar-filter">
          <Select value={status} onChange={setStatus} options={[{ value: '', label: 'All statuses' }, ...STATUSES.map((s) => ({ value: s, label: s }))]} />
        </div>
      </div>

      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Patient</th><th>Type</th><th>Category</th><th>Routed to</th><th>Date</th><th>File</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan="8" className="admin-empty">Loading…</td></tr>}
              {!loading && shown.length === 0 && <tr><td colSpan="8" className="admin-empty">No reports found.</td></tr>}
              {!loading && shown.map((r) => (
                <tr key={r.id} className={!r.category ? 'row-untriaged' : ''}>
                  <td className="t-name">{r.patientName}{r.patientUhid ? <span className="t-sub"> · {r.patientUhid}</span> : ''}</td>
                  <td>{r.type}</td>
                  <td>
                    {r.category ? (
                      <button type="button" className="adm-cat-set is-set" onClick={() => setTriage(r)} title="Change category">
                        <span className={'adm-badge ' + (CATEGORY_TONE[r.category] || 'gray')}>{r.category}</span>
                        <span className="adm-cat-change">Change</span>
                      </button>
                    ) : (
                      <button type="button" className="adm-cat-set" onClick={() => setTriage(r)}>{TagIcon}<span>Set category</span></button>
                    )}
                  </td>
                  <td>{r.category ? (r.doctor || <span className="adm-unassigned">No specialist tagged</span>) : '—'}</td>
                  <td>{r.date || '—'}</td>
                  <td>{r.fileUrl ? <a className="adm-link" href={r.fileUrl} target="_blank" rel="noreferrer">View</a> : '—'}</td>
                  <td><span className={'adm-badge ' + (STONE[r.status] || 'blue')}>{r.status}</span></td>
                  <td><div className="row-actions"><button className="icon-btn danger" onClick={() => del(r)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {triage && <TriageModal report={triage} on401={on401} onClose={() => setTriage(null)} onDone={onTriageDone} />}
    </div>
  );
}
