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

// The filename the patient uploaded, pulled from the notes ("… · filename.pdf"), else the type.
const fileLabel = (r) => {
  const tail = String(r.notes || '').split('·').pop().trim();
  return tail && /\.\w{2,4}$/.test(tail) ? tail : (r.type || 'Document');
};

// Group a flat report list into one folder per patient, so an upload of several files reads as one
// case rather than several rows.
function toFolders(reports) {
  const map = new Map();
  for (const r of reports) {
    const key = r.patientUhid || 'name:' + String(r.patientName || '').toLowerCase();
    if (!map.has(key)) map.set(key, { key, patientName: r.patientName, patientUhid: r.patientUhid, type: r.type, reports: [] });
    map.get(key).reports.push(r);
  }
  const folders = [...map.values()].map((f) => {
    const cats = [...new Set(f.reports.map((r) => r.category).filter(Boolean))];
    const untriaged = f.reports.filter((r) => !r.category).length;
    const category = untriaged ? null : (cats.length === 1 ? cats[0] : cats.length > 1 ? 'Mixed' : null);
    const doctor = f.reports.map((r) => r.doctor).find(Boolean) || null;
    const date = f.reports.map((r) => r.date).find(Boolean) || null;
    const statuses = f.reports.map((r) => r.status);
    const status = statuses.every((s) => s === 'Reviewed' || s === 'Archived') ? 'Reviewed'
      : statuses.includes('Pending Review') ? 'Pending Review' : statuses[0];
    return { ...f, cats, untriaged, category, doctor, date, status, count: f.reports.length };
  });
  // Folders needing triage float to the top.
  folders.sort((a, b) => (b.untriaged > 0) - (a.untriaged > 0));
  return folders;
}

/* ---------- Triage modal: works on one report or a whole folder ---------- */
function TriageModal({ report, folder, onClose, onDone, on401 }) {
  const isFolder = !!folder;
  const first = isFolder ? folder.reports[0] : report;
  const [category, setCategory] = useState((isFolder ? folder.category : report.category) || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ai, setAi] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState('');

  const runAI = () => {
    setAiBusy(true); setAiErr(''); setAi(null);
    api(`/reports/${first.id}/analyze`, { method: 'POST', on401 })
      .then((r) => { setAi(r); if (r.suggestedCategory && !category) setCategory(r.suggestedCategory); })
      .catch((e) => setAiErr(e.message))
      .finally(() => setAiBusy(false));
  };

  const submit = () => {
    if (!category) return setErr('Pick a category to route.');
    setBusy(true); setErr('');
    const req = isFolder
      ? api('/reports/categorise-folder', { method: 'POST', on401, body: JSON.stringify({ patientUhid: folder.patientUhid, patientName: folder.patientName, category }) })
      : api(`/reports/${report.id}/categorise`, { method: 'POST', on401, body: JSON.stringify({ category }) });
    req.then((res) => onDone(res, isFolder)).catch((e) => { setErr(e.message); setBusy(false); });
  };

  const files = isFolder ? folder.reports : [report];
  const heading = isFolder
    ? (folder.untriaged ? 'Triage this folder' : 'Re-triage this folder')
    : (report.category ? 'Re-triage report' : 'Triage report');

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        <div className="modal-head left">
          <h3>{heading}</h3>
          <p className="modal-sub">{first.patientName}{first.patientUhid ? ` · ${first.patientUhid}` : ''}{isFolder ? ` — ${files.length} file${files.length > 1 ? 's' : ''}` : ` — ${report.type}`}</p>
        </div>

        <div className="triage-body">
          <div className="triage-files">
            {files.some((f) => f.fileUrl) ? files.map((f) => (
              f.fileUrl
                ? <a className="triage-file" key={f.id} href={f.fileUrl} target="_blank" rel="noreferrer">{TagIcon}<span>{fileLabel(f)}</span><span aria-hidden="true">↗</span></a>
                : <span className="triage-file muted" key={f.id}>{fileLabel(f)} — no file</span>
            )) : <span className="triage-file muted">No file attached</span>}
          </div>

          {!isFolder && report.fileUrl && (
            <button type="button" className="ai-read-btn" disabled={aiBusy} onClick={runAI}>
              <span aria-hidden="true">✨</span> {aiBusy ? 'Reading the report…' : ai ? 'Re-read with AI' : 'Read with AI'}
            </button>
          )}
          {aiErr && <p className="admin-msg err show">{aiErr}</p>}
          {ai && (
            <div className="ai-read-result">
              <div className="ai-read-top">
                AI suggests <span className={'adm-badge ' + (CATEGORY_TONE[ai.suggestedCategory] || 'gray')}>{ai.suggestedCategory}</span>
                <span className="ai-conf">{ai.confidence} confidence</span>
                {ai.suggestedCategory !== category && <button type="button" className="ai-use" onClick={() => setCategory(ai.suggestedCategory)}>Use this</button>}
              </div>
              {ai.reportType && ai.reportType !== 'Unknown' && <p className="ai-meta">Report type: <strong>{ai.reportType}</strong></p>}
              {ai.summary && <p className="ai-summary">{ai.summary}</p>}
              {ai.keyFindings?.length > 0 && <ul className="ai-findings">{ai.keyFindings.map((f, i) => <li key={i}>{f}</li>)}</ul>}
              {ai.caveats && <p className="ai-caveat">⚠ {ai.caveats}</p>}
              <p className="ai-disclaimer">AI decision-support — verify against the file. The specialist makes the diagnosis.</p>
            </div>
          )}

          <span className="adm-cat-label">Choose a category</span>
          <div className="adm-cat-checks">
            {CATEGORIES.map((c) => (
              <button type="button" key={c} className={'adm-cat-chip' + (category === c ? ' on' : '')} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>
          <p className="triage-note">
            {isFolder
              ? 'Every file in this folder is routed together to one specialist, the least-loaded one tagged for this category.'
              : 'The report is routed automatically to the least-loaded specialist tagged for this category.'}
          </p>
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
  const [triage, setTriage] = useState(null); // { report } or { folder }
  const [open, setOpen] = useState(() => new Set()); // expanded folder keys

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
  const folders = toFolders(shown);

  const toggle = (key) => setOpen((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const onTriageDone = (res, isFolder) => {
    const n = isFolder ? `${res.count} file${res.count > 1 ? 's' : ''}` : 'Report';
    if (res.assignedTo) flash(`${n} categorised as “${res.category}” · routed to ${res.assignedTo}.`);
    else flash(`${n} categorised as “${res.category}”, but no specialist is tagged for it yet — set one in Doctor & Staff Management.`, 'err');
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

  const CatCell = ({ f }) => (
    (f.untriaged > 0 || f.category === 'Mixed')
      ? <button type="button" className="adm-cat-set" onClick={() => setTriage({ folder: f })}>{TagIcon}<span>{f.category === 'Mixed' ? 'Unify category' : 'Set category'}</span></button>
      : (
        <button type="button" className="adm-cat-set is-set" onClick={() => setTriage({ folder: f })} title="Change category for the whole folder">
          <span className={'adm-badge ' + (CATEGORY_TONE[f.category] || 'gray')}>{f.category}</span>
          <span className="adm-cat-change">Change</span>
        </button>
      )
  );

  return (
    <div className="adm-module">
      <div className="adm-page-head">
        <div><h1>Reports Management</h1><p>Triage patient uploads and route each to the right specialist — {folders.length} patient{folders.length === 1 ? '' : 's'}, {shown.length} report{shown.length === 1 ? '' : 's'}.</p></div>
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
            <thead><tr><th>Patient</th><th>Type</th><th>Category</th><th>Routed to</th><th>Date</th><th>Files</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan="8" className="admin-empty">Loading…</td></tr>}
              {!loading && folders.length === 0 && <tr><td colSpan="8" className="admin-empty">No reports found.</td></tr>}
              {!loading && folders.map((f) => {
                const isOpen = open.has(f.key);
                return (
                  <FolderRows
                    key={f.key} f={f} isOpen={isOpen} toggle={() => toggle(f.key)}
                    onFolderTriage={() => setTriage({ folder: f })}
                    onFileTriage={(r) => setTriage({ report: r })}
                    onDelete={del} CatCell={CatCell}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {triage && <TriageModal report={triage.report} folder={triage.folder} on401={on401} onClose={() => setTriage(null)} onDone={onTriageDone} />}
    </div>
  );
}

// One folder row, plus its files as sub-rows when expanded.
function FolderRows({ f, isOpen, toggle, onFileTriage, onDelete, CatCell }) {
  return (
    <>
      <tr className={'adm-folder-row' + (f.untriaged ? ' row-untriaged' : '')}>
        <td className="t-name">{f.patientName}{f.patientUhid ? <span className="t-sub"> · {f.patientUhid}</span> : ''}</td>
        <td>{f.type}</td>
        <td><CatCell f={f} /></td>
        <td>{f.category && f.category !== 'Mixed' ? (f.doctor || <span className="adm-unassigned">No specialist tagged</span>) : (f.doctor || '—')}</td>
        <td>{f.date || '—'}</td>
        <td>
          <button type="button" className="adm-folder-toggle" onClick={toggle} aria-expanded={isOpen}>
            <span className={'adm-chev' + (isOpen ? ' open' : '')} aria-hidden="true">▸</span>
            {f.count} file{f.count > 1 ? 's' : ''}
            {f.untriaged > 0 && <span className="adm-badge amber" style={{ marginLeft: '.4rem' }}>{f.untriaged} new</span>}
          </button>
        </td>
        <td><span className={'adm-badge ' + (STONE[f.status] || 'blue')}>{f.status}</span></td>
        <td />
      </tr>
      {isOpen && f.reports.map((r) => (
        <tr className="adm-subrow" key={r.id}>
          <td className="t-name adm-subcell">↳ {fileLabel(r)}</td>
          <td>{r.type}</td>
          <td>
            {r.category ? (
              <button type="button" className="adm-cat-set is-set" onClick={() => onFileTriage(r)} title="Change this file's category">
                <span className={'adm-badge ' + (CATEGORY_TONE[r.category] || 'gray')}>{r.category}</span>
                <span className="adm-cat-change">Change</span>
              </button>
            ) : (
              <button type="button" className="adm-cat-set" onClick={() => onFileTriage(r)}>{TagIcon}<span>Set category</span></button>
            )}
          </td>
          <td>{r.category ? (r.doctor || <span className="adm-unassigned">No specialist tagged</span>) : '—'}</td>
          <td>{r.date || '—'}</td>
          <td>{r.fileUrl ? <a className="adm-link" href={r.fileUrl} target="_blank" rel="noreferrer">View</a> : '—'}</td>
          <td><span className={'adm-badge ' + (STONE[r.status] || 'blue')}>{r.status}</span></td>
          <td><div className="row-actions"><button className="icon-btn danger" onClick={() => onDelete(r)}>Delete</button></div></td>
        </tr>
      ))}
    </>
  );
}
