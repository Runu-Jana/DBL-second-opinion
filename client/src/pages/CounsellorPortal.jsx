// Counsellor portal — the triage desk that sits in front of the specialists.
//
// Two views: a list of patient folders, and one folder opened. A folder holds everything the
// patient sent, the AI's reading of each document, the counsellor's own assessment, and the
// assignment that hands the case on. A case cannot be assigned until the assessment is written,
// because that report is the whole point of this stage — it is what the specialist receives.
import { useEffect, useRef, useState } from 'react';
import { Select } from '../components/AdminFields.jsx';
import StaffBell from '../components/StaffBell.jsx';

const initials = (n = '') => n.replace(/^(Dr|Mr|Ms|Mrs)\.?\s*/i, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
// First name for the greeting, with any title stripped — otherwise "Dr. Anirudh" greets "Dr.".
const firstName = (n = '') => n.replace(/^(Dr|Mr|Ms|Mrs)\.?\s*/i, '').split(/\s+/)[0] || n;
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const extOf = (u = '') => (u.split('?')[0].split('.').pop() || '').toLowerCase();
const isVideo = (u) => ['mp4', 'mov', 'webm', 'ogg', 'ogv'].includes(extOf(u));
const isImage = (u) => ['png', 'jpg', 'jpeg', 'webp'].includes(extOf(u));
const isWord = (u) => ['doc', 'docx'].includes(extOf(u));
const kindOf = (u) => (isVideo(u) ? 'Video' : isImage(u) ? 'Image' : isWord(u) ? 'Word' : extOf(u) === 'pdf' ? 'PDF' : 'File');

export default function CounsellorPortal({ api, me, onLogout }) {
  const [tab, setTab] = useState('folders');
  const [summary, setSummary] = useState(null);
  const [folders, setFolders] = useState([]);
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);   // fresh from the server, so admin edits to name/role show without re-login

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  const loadFolders = () => {
    setLoading(true);
    api('/counsellor/folders' + (q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''))
      .then((d) => { setFolders(Array.isArray(d) ? d : []); setLoading(false); })
      .catch((e) => { flash(e.message); setLoading(false); });
  };
  useEffect(() => { api('/counsellor/summary').then(setSummary).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api('/counsellor/me').then(setProfile).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(loadFolders, 250); return () => clearTimeout(t); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefer the freshly-fetched record over the login token, so an admin rename shows here.
  const meLive = profile || me;
  const name = meLive?.name || 'Counsellor';

  if (openId) {
    return (
      <Folder
        api={api}
        id={openId}
        onBack={() => { setOpenId(null); loadFolders(); api('/counsellor/summary').then(setSummary).catch(() => {}); }}
        flash={flash}
        msg={msg}
        me={meLive}
        onLogout={onLogout}
      />
    );
  }

  const waiting = folders.filter((f) => f.untriaged > 0 || !f.hasReport);
  const shown = tab === 'waiting' ? waiting : folders;

  return (
    <div className="doc-shell">
      <Topbar name={name} me={meLive} onLogout={onLogout} api={api} />
      <main className="doc-main">
        {msg && <div className="doc-flash">{msg}</div>}
        <h1 className="doc-welcome">Welcome, {firstName(name)}</h1>
        <p className="doc-note">Review what each patient sent, write the case report, then assign the specialist.</p>

        <div className="doc-stats">
          <Stat label="Patient folders" value={summary?.patients} />
          <Stat label="Documents awaiting triage" value={summary?.awaitingTriage} tone="amber" />
          <Stat label="Documents assigned" value={summary?.assigned} tone="green" />
          <Stat label="Documents in total" value={summary?.totalDocs} />
        </div>

        <div className="cns-toolbar">
          <div className="chip-row">
            <button type="button" className={'chip' + (tab === 'folders' ? ' active' : '')} onClick={() => setTab('folders')}>All folders ({folders.length})</button>
            <button type="button" className={'chip' + (tab === 'waiting' ? ' active' : '')} onClick={() => setTab('waiting')}>Needs my attention ({waiting.length})</button>
          </div>
          <input className="cns-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, UHID or email…" />
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Patient</th><th>UHID</th><th>Documents</th><th>Case report</th><th>Assigned to</th><th>Joined</th><th></th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan="7" className="admin-empty">Loading…</td></tr>}
              {!loading && !shown.length && <tr><td colSpan="7" className="admin-empty">No patient folders yet.</td></tr>}
              {!loading && shown.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div className="adm-cell-user">
                      <span className="adm-mini-avatar sm">{initials(f.name)}</span>
                      <span className="adm-cell-user-meta">
                        <strong>{f.name}</strong>
                        {(f.phone || f.email) && <span>{[f.phone, f.email].filter(Boolean).join(' · ')}</span>}
                      </span>
                    </div>
                  </td>
                  <td className="mono">{f.uhid || '—'}</td>
                  <td>
                    {f.documents}
                    {f.untriaged > 0 && <span className="adm-badge amber" style={{ marginLeft: '.4rem' }}>{f.untriaged} new</span>}
                  </td>
                  <td>{f.hasReport ? <span className="adm-badge green">Written</span> : <span className="adm-badge gray">Not written</span>}</td>
                  <td>{f.assignedDoctor || <span className="adm-badge amber">Unassigned</span>}</td>
                  <td>{fmtDate(f.joined)}</td>
                  <td><div className="row-actions"><button className="icon-btn" onClick={() => setOpenId(f.id)}>Open folder</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function Topbar({ name, me, onLogout, api }) {
  return (
    <header className="doc-topbar">
      <div className="doc-brand">
        <span className="doc-brand-text"><strong>DBL Counsellor Desk</strong><span>Patient intake &amp; triage</span></span>
      </div>
      <div className="doc-user">
        {api && <StaffBell api={api} />}
        <span className="doc-user-avatar">{initials(name)}</span>
        <span className="doc-user-meta"><strong>{name}</strong><span>{me?.jobRole || 'Counsellor'}</span></span>
        <button type="button" className="doc-logout" onClick={onLogout}>Log out</button>
      </div>
    </header>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className={'doc-stat' + (tone ? ' ' + tone : '')}>
      <strong>{value ?? '—'}</strong>
      <span>{label}</span>
    </div>
  );
}

// ---- one patient's folder ----------------------------------------------------------------
function Folder({ api, id, onBack, flash, msg, me, onLogout }) {
  const [data, setData] = useState(null);
  const [report, setReport] = useState('');
  const [cancerType, setCancerType] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [doctor, setDoctor] = useState('');
  const [busy, setBusy] = useState('');

  // The case-report box starts small and grows with what is typed, up to a cap, then scrolls —
  // so an empty folder is not dominated by a tall empty field, and a long assessment still fits.
  const reportRef = useRef(null);
  const autosize = () => {
    const el = reportRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(72, Math.min(el.scrollHeight, 384))}px`;
  };
  useEffect(autosize, [report, data]);

  const load = () => api(`/counsellor/folders/${id}`).then((d) => {
    setData(d);
    setReport(d.case?.counsellorReport || '');
    setCancerType(d.case?.cancerType || '');
    setPriority(d.case?.priority || 'Normal');
    setDoctor(d.case?.expert || '');
  }).catch((e) => flash(e.message));
  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <div className="doc-shell"><Topbar name={me?.name} me={me} onLogout={onLogout} api={api} /><main className="doc-main"><p>Loading folder…</p></main></div>;

  const { patient, documents, doctors, categories } = data;
  const read = documents.filter((d) => d.aiSummary).length;

  const analyse = (docId) => {
    setBusy('doc' + docId);
    api(`/counsellor/documents/${docId}/analyse`, { method: 'POST' })
      .then(() => { flash('AI reading saved.'); return load(); })
      .catch((e) => flash(e.message))
      .finally(() => setBusy(''));
  };
  const buildDraft = () => {
    setBusy('draft');
    api(`/counsellor/folders/${id}/draft`, { method: 'POST' })
      .then((r) => { setReport((prev) => prev || r.draft); flash('Draft ready — edit it before saving.'); })
      .catch((e) => flash(e.message))
      .finally(() => setBusy(''));
  };
  const saveReport = () => {
    setBusy('save');
    api(`/counsellor/folders/${id}/report`, { method: 'PUT', body: JSON.stringify({ report, cancerType, priority }) })
      .then(() => { flash('Case report saved.'); return load(); })
      .catch((e) => flash(e.message))
      .finally(() => setBusy(''));
  };
  const assign = () => {
    setBusy('assign');
    api(`/counsellor/folders/${id}/assign`, { method: 'POST', body: JSON.stringify({ doctor, category: cancerType }) })
      .then(() => { flash(`Case assigned to ${doctor}.`); return load(); })
      .catch((e) => flash(e.message))
      .finally(() => setBusy(''));
  };

  // Specialists who cover the chosen category float to the top; the rest stay selectable.
  const matching = cancerType ? doctors.filter((d) => d.categories.includes(cancerType)) : doctors;
  const others = cancerType ? doctors.filter((d) => !d.categories.includes(cancerType)) : [];

  return (
    <div className="doc-shell">
      <Topbar name={me?.name} me={me} onLogout={onLogout} api={api} />
      <main className="doc-main">
        {msg && <div className="doc-flash">{msg}</div>}
        <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={onBack}>← All folders</button>

        <div className="cns-folder-head">
          <span className="adm-mini-avatar">{initials(patient.name)}</span>
          <div>
            <h1>{patient.name}</h1>
            <p>
              <span className="mono">{patient.uhid || 'no UHID'}</span>
              {patient.phone ? ` · ${patient.phone}` : ''}
              {patient.email ? ` · ${patient.email}` : ''}
              {` · joined ${fmtDate(patient.createdAt)}`}
            </p>
          </div>
          {data.case?.expert && <span className="adm-badge green">Assigned to {data.case.expert}</span>}
        </div>

        {/* ---- documents ---- */}
        {/* What the patient actually wants answered. It belongs above the scans, because it is
            the question the whole case is meant to answer. */}
        {data.case?.patientQuestions && (
          <section className="dash-card">
            <div className="dash-card-head"><h2>What the patient asked</h2></div>
            <pre className="cns-ai">{data.case.patientQuestions}</pre>
          </section>
        )}

        <section className="dash-card">
          <div className="dash-card-head">
            <h2>Documents ({documents.length})</h2>
            <span className="cns-muted">{read} read by AI</span>
          </div>
          {!documents.length && <p className="cns-muted">This patient has not uploaded anything yet.</p>}
          <ul className="cns-docs">
            {documents.map((d) => (
              <li key={d.id}>
                <div className="cns-doc-head">
                  <span className="adm-badge blue">{kindOf(d.fileUrl)}</span>
                  <strong>{d.type || 'Document'}</strong>
                  <span className="cns-muted">{d.date || fmtDate(d.createdAt)}</span>
                  <span className="cns-doc-actions">
                    {d.fileUrl && <a className="icon-btn" href={d.fileUrl} target="_blank" rel="noreferrer">View</a>}
                    {d.fileUrl && <a className="icon-btn" href={d.fileUrl} download>Download</a>}
                    <button type="button" className="icon-btn" disabled={busy === 'doc' + d.id} onClick={() => analyse(d.id)}>
                      {busy === 'doc' + d.id ? 'Reading…' : d.aiSummary ? 'Re-read with AI' : 'Read with AI'}
                    </button>
                  </span>
                </div>
                {d.notes && <p className="cns-muted cns-doc-note">{d.notes}</p>}
                {d.aiSummary && <pre className="cns-ai">{d.aiSummary}</pre>}
              </li>
            ))}
          </ul>
        </section>

        {/* ---- the counsellor's own report ---- */}
        <section className="dash-card">
          <div className="dash-card-head">
            <h2>Case report</h2>
            <button type="button" className="doc-btn doc-btn-ghost" disabled={busy === 'draft'} onClick={buildDraft}>
              {busy === 'draft' ? 'Building…' : 'Build AI draft'}
            </button>
          </div>
          <p className="cns-muted">
            This is what the specialist receives. The AI draft is a starting point built from the readings above —
            check it against the documents and write your own assessment before assigning.
          </p>
          <textarea ref={reportRef} className="cns-report cns-report-auto" rows={3} value={report}
            onChange={(e) => { setReport(e.target.value); autosize(); }}
            placeholder="Your assessment of this patient's case…" />
          <div className="cns-row">
            <label>Cancer type
              <Select value={cancerType} onChange={setCancerType} options={categories} placeholder="Select category" />
            </label>
            <label>Priority
              <Select value={priority} onChange={setPriority} options={['Normal', 'High', 'Urgent']} />
            </label>
            <button type="button" className="doc-btn doc-btn-primary" disabled={busy === 'save'} onClick={saveReport}>
              {busy === 'save' ? 'Saving…' : 'Save case report'}
            </button>
          </div>
          {data.case?.counsellor && <p className="cns-muted">Last saved by {data.case.counsellor}.</p>}
        </section>

        {/* ---- hand it to a specialist ---- */}
        <section className="dash-card">
          <div className="dash-card-head"><h2>Assign a specialist</h2></div>
          {!data.case?.counsellorReport && (
            <p className="cns-warn">Save your case report first — it is what the specialist receives with the patient.</p>
          )}
          <div className="cns-row">
            <label>Specialist
              <Select
                value={doctor}
                onChange={setDoctor}
                options={[...matching.map((d) => d.name), ...others.map((d) => d.name)]}
                placeholder={cancerType ? `Doctors covering ${cancerType}` : 'Select a doctor'}
              />
            </label>
            <button type="button" className="doc-btn doc-btn-primary" disabled={busy === 'assign' || !data.case?.counsellorReport} onClick={assign}>
              {busy === 'assign' ? 'Assigning…' : 'Assign & send case'}
            </button>
          </div>
          {cancerType && (
            <p className="cns-muted">
              {matching.length
                ? `${matching.length} specialist(s) cover ${cancerType}.`
                : `No specialist is tagged for ${cancerType} — tag one in Doctor & Staff Management, or pick someone below.`}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
