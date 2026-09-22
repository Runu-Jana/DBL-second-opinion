import { useState, useEffect, useRef } from 'react';
import { CATEGORY_TONE } from '../lib/categories.js';
import CounsellorPortal from './CounsellorPortal.jsx';
import StaffBell from '../components/StaffBell.jsx';
import PasswordField from '../components/PasswordField.jsx';
import { getDoctorToken, setDoctorToken, clearDoctorToken, endDoctorSession, SESSION_ENDED } from '../api.js';

const RTONE = { 'Pending Review': 'amber', Reviewed: 'green', Uploaded: 'blue', Archived: 'gray' };
const PTONE = { 'New Patient': 'blue', 'Under Treatment': 'teal', 'Follow-up': 'amber', Completed: 'green', Discharged: 'gray' };
const initials = (n = '') => n.replace(/^(Dr|Mr|Ms|Mrs)\.?\s*/i, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

async function docApi(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const token = getDoctorToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch('/api' + path, { ...opts, headers });
  let body = {};
  try { body = await res.json(); } catch { /* empty */ }
  if (res.status === 401 && token) endDoctorSession();
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
  const [note, setNote] = useState('');
  const [email, setEmail] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const password = e.target.password.value;
    docApi('/auth/doctor-login', { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase(), password }) })
      .then((r) => { setDoctorToken(r.token); onLogin(r.token); })
      .catch((ex) => setErr(ex.message));
  };
  // Sends a set-password link. The backend picks activation vs reset based on whether
  // this doctor has ever set a password, and always answers generically.
  const forgot = () => {
    setErr(''); setNote('');
    if (!email.trim()) return setErr('Enter your email address first, then tap “Forgot password?”.');
    docApi('/auth/doctor-forgot', { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase() }) })
      .then(() => setNote('If that email is registered, we’ve sent a link to set your password. Check your inbox (and spam).'))
      .catch((ex) => setErr(ex.message));
  };
  return (
    <div className="doc-login-wrap">
      <form className="doc-login" onSubmit={submit}>
        <span className="doc-login-mark">{Shield}</span>
        <h1>Staff Login</h1>
        <p>Doctors and counsellors, sign in to your dashboard.</p>
        <label>Email<input type="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="you@dblhealthcare.com" required /></label>
        <PasswordField label="Password" name="password" autoComplete="current-password" placeholder="Your password" />
        {err && <p className="doc-err">{err}</p>}
        {note && <p className="doc-note">{note}</p>}
        <button type="submit" className="btn btn-primary btn-block">Log in</button>
        <button type="button" className="doc-forgot" onClick={forgot}>Forgot password?</button>
      </form>
    </div>
  );
}

function DoctorDashboard({ onLogout, preview = false }) {
  const [me, setMe] = useState(null);
  const [cases, setCases] = useState([]);
  const [patients, setPatients] = useState([]);
  const [msg, setMsg] = useState('');
  const [caseUhid, setCase] = useState(null);
  const [handover, setHandover] = useState(null);
  const [opinion, setOpinion] = useState('');
  const [busy, setBusy] = useState('');
  const [noteFor, setNoteFor] = useState(null);   // document id whose note is being edited
  const [noteText, setNoteText] = useState('');
  const [thread, setThread] = useState(null);
  const [draft, setDraft] = useState('');

  // The opinion editor starts a few rows tall and grows with what the specialist writes, up to a
  // cap, then scrolls — like the counsellor's report box, not a fixed wall of empty space.
  const opinionRef = useRef(null);
  const autosizeOpinion = () => {
    const el = opinionRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(120, Math.min(el.scrollHeight, 640))}px`;
  };
  useEffect(autosizeOpinion, [opinion]);

  const load = () => {
    docApi('/doctor/me').then(setMe).catch(() => onLogout());
    docApi('/doctor/cases').then(setCases).catch(() => {});
    docApi('/doctor/patients').then(setPatients).catch(() => {});
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The counsellor's assessment is why this case was routed here, so it opens with the patient.
  useEffect(() => {
    if (!caseUhid) { setHandover(null); return; }
    docApi(`/doctor/cases/${caseUhid}`)
      .then((h) => { setHandover(h); setOpinion(h.doctorOpinion || ''); })
      .catch((e) => { setMsg(e.message); setCase(null); });
  }, [caseUhid]);

  useEffect(() => {
    if (!caseUhid) { setThread(null); return; }
    docApi(`/doctor/messages/${caseUhid}`).then((d) => setThread(d.messages || [])).catch(() => setThread([]));
  }, [caseUhid]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };
  const reopen = () => docApi(`/doctor/cases/${caseUhid}`).then((h) => { setHandover(h); setOpinion(h.doctorOpinion || ''); });

  // Explicitly a draft, not the opinion: it lands in the editor for the doctor to rewrite.
  const draftWithAI = () => {
    setBusy('draft');
    docApi(`/doctor/cases/${caseUhid}/draft`, { method: 'POST' })
      .then((r) => { setOpinion(r.draft); flash('Draft ready — review and edit it before sending.'); })
      .catch((e) => flash(e.message))
      .finally(() => setBusy(''));
  };
  // The counsellor may already have read this; a specialist re-reading it themselves, or
  // reading one that arrived after triage, should not have to go back and ask.
  const analyseDoc = (docId) => {
    setBusy('doc' + docId);
    docApi(`/doctor/documents/${docId}/analyse`, { method: 'POST' })
      .then(() => { flash('AI reading saved.'); return reopen(); })
      .catch((e) => flash(e.message))
      .finally(() => setBusy(''));
  };
  const saveNote = (docId) => {
    setBusy('note' + docId);
    docApi(`/doctor/documents/${docId}/note`, { method: 'PUT', body: JSON.stringify({ note: noteText }) })
      .then(() => { flash('Note saved.'); setNoteFor(null); return reopen(); })
      .catch((e) => flash(e.message))
      .finally(() => setBusy(''));
  };

  const sendMessage = (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setBusy('msg');
    docApi(`/doctor/messages/${caseUhid}`, { method: 'POST', body: JSON.stringify({ body }) })
      .then(() => { setDraft(''); return docApi(`/doctor/messages/${caseUhid}`); })
      .then((d) => setThread(d.messages || []))
      .catch((err) => flash(err.message))
      .finally(() => setBusy(''));
  };

  const saveOpinion = () => {
    setBusy('save');
    docApi(`/doctor/cases/${caseUhid}/opinion`, { method: 'PUT', body: JSON.stringify({ opinion }) })
      .then(() => { flash('Saved. Not sent to the patient yet.'); return reopen(); })
      .catch((e) => flash(e.message))
      .finally(() => setBusy(''));
  };
  const deliver = () => {
    if (!window.confirm('Send this opinion to the patient? They will be emailed and will be able to read it in their portal.')) return;
    setBusy('send');
    docApi(`/doctor/cases/${caseUhid}/deliver`, { method: 'POST' })
      .then((r) => { flash(r.emailed ? 'Sent — the patient has been emailed.' : 'Sent. No email address on file, so nothing was emailed.'); load(); return reopen(); })
      .catch((e) => flash(e.message))
      .finally(() => setBusy(''));
  };


  const name = me?.doctor?.name || 'Doctor';
  const stats = me?.stats || { patients: 0, pendingReports: 0, totalReports: 0 };

  return (
    <div className="doc-shell">
      <header className="doc-topbar">
        <div className="doc-brand">{Shield}<span className="doc-brand-text"><strong>DBL Doctor Portal</strong><span>{me?.doctor?.department || 'Oncology'}</span></span></div>
        <div className="doc-user">
          <StaffBell api={docApi} />
          <span className="doc-user-avatar">{initials(name)}</span>
          <span className="doc-user-meta"><strong>{name}</strong><span>{me?.doctor?.role || 'Doctor'}</span></span>
          <button type="button" className="doc-logout" onClick={onLogout}>Log out</button>
        </div>
      </header>

      <main className="doc-main">
        <div className="doc-welcome"><h1>Welcome, {name} <span role="img" aria-label="wave">👋</span></h1><p>Here are the cases assigned to you.</p></div>
        {msg && <p className="doc-flash">{msg}</p>}

        <div className="doc-stats">
          <div className="adm-stat"><span className="adm-stat-label">My Patients</span><strong className="adm-stat-value">{stats.patients}</strong></div>
          <div className="adm-stat"><span className="adm-stat-label">Reports Pending Review</span><strong className="adm-stat-value">{stats.pendingReports}</strong></div>
          <div className="adm-stat"><span className="adm-stat-label">Total Reports</span><strong className="adm-stat-value">{stats.totalReports}</strong></div>
        </div>

        {handover && (
          <section className="adm-card doc-case" id="doc-case-print">
            <div className="adm-card-head no-print">
              <h2>Case — {handover.patient?.name || caseUhid}</h2>
              <span className="doc-case-actions">
                {handover.status === 'Delivered' && <span className="adm-badge green">Sent to patient</span>}
                <button type="button" className="icon-btn" onClick={() => window.print()}>Print</button>
                <button type="button" className="icon-btn" onClick={() => setCase(null)}>Close</button>
              </span>
            </div>

            <div className="doc-case-meta">
              <strong>{handover.patient?.name}</strong>
              <span className="mono">{caseUhid}</span>
              {handover.cancerType && <span className="adm-badge blue">{handover.cancerType}</span>}
              {handover.priority && handover.priority !== 'Normal' && <span className="adm-badge amber">{handover.priority}</span>}
            </div>

            {handover.patientQuestions && (
              <>
                <h3 className="doc-case-h3">What the patient asked</h3>
                <pre className="cns-ai">{handover.patientQuestions}</pre>
              </>
            )}
            <h3 className="doc-case-h3">Counsellor handover{handover.counsellor ? ` — ${handover.counsellor}` : ''}</h3>
            {handover.counsellorReport
              ? <pre className="cns-ai">{handover.counsellorReport}</pre>
              : <p className="cns-muted">No counsellor report was attached to this case.</p>}

            <h3 className="doc-case-h3">Patient documents ({handover.documents?.length || 0})</h3>
            <ul className="cns-docs">
              {(handover.documents || []).map((d) => (
                <li key={d.id}>
                  <div className="cns-doc-head">
                    <strong>{d.type || 'Document'}</strong>
                    <span className="cns-muted">{d.date || ''}</span>
                    <span className="cns-doc-actions no-print">
                      {d.fileUrl && <a className="icon-btn" href={d.fileUrl} target="_blank" rel="noreferrer">View</a>}
                      {d.fileUrl && <a className="icon-btn" href={d.fileUrl} download>Download</a>}
                      <button type="button" className="icon-btn" disabled={preview || busy === 'doc' + d.id || !handover.ai}
                        onClick={() => analyseDoc(d.id)}>
                        {busy === 'doc' + d.id ? 'Reading…' : d.aiSummary ? 'Re-read with AI' : 'Summarise with AI'}
                      </button>
                      <button type="button" className="icon-btn"
                        onClick={() => { setNoteFor(noteFor === d.id ? null : d.id); setNoteText(d.notes || ''); }}>
                        {d.notes ? 'Edit note' : 'Add note'}
                      </button>
                    </span>
                  </div>
                  {d.aiSummary && <pre className="cns-ai">{d.aiSummary}</pre>}
                  {d.notes && noteFor !== d.id && <p className="doc-note-saved">{d.notes}</p>}
                  {noteFor === d.id && (
                    <div className="doc-note-edit no-print">
                      <textarea rows={3} value={noteText} readOnly={preview} onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Your note on this document…" />
                      <div className="doc-note-edit-actions">
                        <button type="button" className="doc-btn doc-btn-outline" onClick={() => setNoteFor(null)}>Cancel</button>
                        <button type="button" className="doc-btn doc-btn-primary" disabled={preview || busy === 'note' + d.id} onClick={() => saveNote(d.id)}>
                          {busy === 'note' + d.id ? 'Saving…' : 'Save note'}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <h3 className="doc-case-h3">My second opinion</h3>
            <p className="cns-muted no-print">
              This is what the patient receives. An AI draft is a starting point built from the handover and the
              document readings — check every line against the reports before you send it.
              {handover.patientQuestions && ' The patient asked questions, above: answer each of them in your opinion.'}
            </p>
            <textarea ref={opinionRef} className="cns-report cns-report-auto no-print" rows={5} value={opinion} readOnly={preview} onChange={(e) => { setOpinion(e.target.value); autosizeOpinion(); }}
              placeholder="Your opinion for this patient…" />
            <pre className="cns-ai print-only">{opinion}</pre>
            <div className="doc-actbar no-print">
              <button type="button" className="doc-btn doc-btn-ghost" disabled={preview || busy === 'draft' || !handover.ai} onClick={draftWithAI}>
                {busy === 'draft' ? 'Drafting…' : 'Draft with AI'}
              </button>
              <span className="spacer" />
              <button type="button" className="doc-btn doc-btn-outline" disabled={preview || busy === 'save'} onClick={saveOpinion}>
                {busy === 'save' ? 'Saving…' : 'Save draft'}
              </button>
              <button type="button" className="doc-btn doc-btn-primary" disabled={preview || busy === 'send' || !handover.doctorOpinion} onClick={deliver}>
                {busy === 'send' ? 'Sending…' : handover.status === 'Delivered' ? 'Re-send to patient' : 'Send to patient'}
              </button>
              {(!handover.ai || !handover.doctorOpinion) && (
                <p className="doc-actbar-note">
                  {[!handover.doctorOpinion && 'Save your opinion before it can be sent.',
                    !handover.ai && 'AI drafting is switched off on this server.'].filter(Boolean).join(' ')}
                </p>
              )}
            </div>

            <h3 className="doc-case-h3 no-print">Messages with {handover.patient?.name || 'the patient'}</h3>
            <div className="doc-chat no-print">
              <div className="doc-chat-log">
                {thread === null && <p className="cns-muted">Loading…</p>}
                {thread && thread.length === 0 && (
                  <p className="cns-muted">No messages yet. Anything you send here appears in the patient’s portal.</p>
                )}
                {(thread || []).map((m) => (
                  <div key={m.id} className={'doc-msg ' + (m.sender === 'patient' ? 'from-patient' : 'from-care')}>
                    <span className="doc-msg-who">
                      {m.sender === 'patient' ? (handover.patient?.name || 'Patient') : (m.author || 'Care team')}
                      <em>{new Date(m.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</em>
                    </span>
                    <p>{m.body}</p>
                  </div>
                ))}
              </div>
              <form className="doc-chat-send" onSubmit={sendMessage}>
                <textarea rows={2} value={draft} readOnly={preview} onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write to your patient…" />
                <button type="submit" className="doc-btn doc-btn-primary" disabled={preview || busy === 'msg' || !draft.trim()}>
                  {busy === 'msg' ? 'Sending…' : 'Send'}
                </button>
              </form>
              <p className="cns-muted">Your care team can see this conversation too.</p>
            </div>
            {handover.deliveredAt && <p className="cns-muted">Sent to the patient on {new Date(handover.deliveredAt).toLocaleString('en-IN')}.</p>}
          </section>
        )}
        <section className="adm-card">
          <div className="adm-card-head"><h2>Cases to Review</h2></div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Patient</th><th>Category</th><th>Documents</th><th>Priority</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {cases.length === 0 && <tr><td colSpan="6" className="admin-empty">No cases assigned to you yet.</td></tr>}
                {cases.map((c) => (
                  <tr key={c.key}>
                    <td className="t-name">{c.patientName}{c.uhid ? <span className="t-sub"> · {c.uhid}</span> : ''}</td>
                    <td>{c.category ? <span className={'adm-badge ' + (CATEGORY_TONE[c.category] || 'gray')}>{c.category}</span> : '—'}</td>
                    <td>
                      {c.documents} file{c.documents === 1 ? '' : 's'}
                      {c.pending > 0 && <span className="adm-badge amber" style={{ marginLeft: '.4rem' }}>{c.pending} new</span>}
                      {c.types.length > 0 && <span className="t-sub" style={{ display: 'block' }}>{c.types.join(', ')}</span>}
                    </td>
                    <td>{c.priority && c.priority !== 'Normal' ? <span className="adm-badge amber">{c.priority}</span> : '—'}</td>
                    <td>
                      {c.delivered
                        ? <span className="adm-badge green">Opinion sent</span>
                        : c.hasOpinion
                          ? <span className="adm-badge blue">Draft saved</span>
                          : <span className="adm-badge amber">Awaiting your opinion</span>}
                    </td>
                    <td><div className="row-actions">{c.uhid && <button className="icon-btn" onClick={() => setCase(c.uhid)}>Open case</button>}</div></td>
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
              <thead><tr><th>Patient</th><th>UHID</th><th>Cancer Type</th><th>Stage</th><th>Status</th><th>Last Visit</th><th></th></tr></thead>
              <tbody>
                {patients.length === 0 && <tr><td colSpan="7" className="admin-empty">No patients assigned to you yet.</td></tr>}
                {patients.map((p) => (
                  <tr key={p.id}>
                    <td className="t-name">{p.name}</td>
                    <td className="mono">{p.uhid}</td>
                    <td>{p.cancerType || '—'}</td>
                    <td>{p.stage || '—'}</td>
                    <td><span className={'adm-badge ' + (PTONE[p.status] || 'blue')}>{p.status}</span></td>
                    <td>{p.lastVisit || '—'}</td>
                    <td><div className="row-actions">{p.uhid && <button className="icon-btn" onClick={() => setCase(p.uhid)}>Case &amp; documents</button>}</div></td>
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

// Both jobs sign in here. The session says which panel they get: specialists review the
// reports assigned to them, counsellors work the intake folders that come before that.
function sessionOf(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')))));
  } catch { return {}; }
}

export default function DoctorPortal() {
  const [token, setToken] = useState(getDoctorToken);
  useEffect(() => { document.title = 'Staff Portal — DBL International'; }, []);
  // An expired or revoked session (spotted by docApi) sends us straight back to the login form.
  useEffect(() => {
    const end = () => setToken(null);   // either desk: a rejected staff token ends the session
    window.addEventListener(SESSION_ENDED, end);
    return () => window.removeEventListener(SESSION_ENDED, end);
  }, []);
  const logout = () => { clearDoctorToken(); setToken(null); };
  if (!token) return <DoctorLogin onLogin={setToken} />;
  const session = sessionOf(token);
  // Leaving a preview closes the tab it opened in; if it was opened directly, drop back to login.
  const exitPreview = () => { clearDoctorToken(); window.close(); setToken(null); };
  const preview = !!session.imp;
  const banner = preview ? <PreviewBanner name={session.name} by={session.by} onExit={exitPreview} /> : null;
  if (session.role === 'counsellor') return <>{banner}<CounsellorPortal api={docApi} me={session} onLogout={logout} preview={preview} /></>;
  return <>{banner}<DoctorDashboard onLogout={logout} preview={preview} /></>;
}

// Shown across the top when an admin is viewing a staff dashboard as a read-only preview, so it
// can never be mistaken for the staff member's own session. Writes are blocked on the server too.
function PreviewBanner({ name, by, onExit }) {
  return (
    <div className="imp-banner">
      <span>
        <strong>Admin preview</strong> — viewing {name || 'this staff member'}&rsquo;s dashboard{by ? ` as ${by}` : ''}. Read-only: nothing you do here is saved or sent.
      </span>
      <button type="button" className="imp-exit" onClick={onExit}>Exit preview</button>
    </div>
  );
}
