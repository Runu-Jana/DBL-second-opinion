// Admin: everything about one person, from clicking their name.
//
// The admin panel had the data but only as separate tables — understanding a patient meant
// cross-referencing Patients, Reports, Second Opinions and Communication by hand. This puts the
// whole picture in one place, including the counsellor's internal assessment and the
// doctor-patient conversation, which admin alone can see in full.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import OpinionReport from './OpinionReport.jsx';

const parseReport = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtWhen = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const initials = (n = '') => n.replace(/^(Dr|Mr|Ms|Mrs)\.?\s*/i, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

const Row = ({ label, children }) => (
  <div className="prof-row"><span>{label}</span><strong>{children || '—'}</strong></div>
);

export default function ProfileModal({ kind, id, onClose, on401 }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  const load = (quiet) => {
    if (!quiet) { setData(null); setErr(''); }
    api(`/profiles/${kind}/${id}`, { on401 })
      .then(setData)
      .catch((e) => setErr(e.message));
  };
  useEffect(() => { load(); }, [kind, id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const who = data && (kind === 'patient' ? data.patient : data.staff);

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal prof-modal">
        <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>

        {err && <p className="admin-msg err" style={{ display: 'block' }}>{err}</p>}
        {!data && !err && <p className="cns-muted">Loading…</p>}

        {data && (
          <>
            <header className="prof-head">
              <span className="adm-mini-avatar">{initials(who.name)}</span>
              <div>
                <h3>{who.name}</h3>
                <p>
                  {kind === 'patient'
                    ? <>{who.uhid ? <span className="mono">{who.uhid}</span> : 'No UHID'}{who.status ? ` · ${who.status}` : ''}</>
                    : <>{who.role}{who.department ? ` · ${who.department}` : ''}</>}
                </p>
              </div>
            </header>

            {kind === 'patient' ? (
              <PatientBody d={data} api={api} on401={on401} reload={() => load(true)} />
            ) : (
              <StaffBody d={data} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PatientBody({ d, api, on401, reload }) {
  const p = d.patient;
  const k = d.case;
  // The doctor submits an opinion for review; the admin edits it here and sends it to the patient.
  const pending = k && k.status === 'Pending Approval';
  const [report, setReport] = useState(parseReport(k && k.reportData));
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [fullscreen, setFullscreen] = useState(false);   // open the report in a full-viewport view
  useEffect(() => { setReport(parseReport(k && k.reportData)); }, [k && k.id, k && k.reportData]); // eslint-disable-line
  // Leaving the modal always leaves full screen too.
  useEffect(() => () => setFullscreen(false), []);

  const saveEdits = () => {
    if (!report) return;
    setBusy('save'); setNote('');
    api(`/second-opinions/${k.id}/report`, { method: 'PUT', on401, body: JSON.stringify({ reportData: report }) })
      .then(() => { setNote('Changes saved.'); reload(); })
      .catch((e) => setNote(e.message))
      .finally(() => setBusy(''));
  };
  const sendToPatient = () => {
    if (!window.confirm('Send this report to the patient now? They will be emailed and can read it in their portal.')) return;
    setBusy('send'); setNote('');
    // Save any pending edits first, then deliver, so the patient gets exactly what is on screen.
    const saveFirst = report
      ? api(`/second-opinions/${k.id}/report`, { method: 'PUT', on401, body: JSON.stringify({ reportData: report }) })
      : Promise.resolve();
    saveFirst
      .then(() => api(`/second-opinions/${k.id}/deliver`, { method: 'POST', on401 }))
      .then((r) => { setNote(r.emailed ? 'Sent — the patient has been emailed.' : 'Sent to the patient.'); setFullscreen(false); reload(); })
      .catch((e) => setNote(e.message))
      .finally(() => setBusy(''));
  };

  // The report shown large, over the whole viewport — editable while it awaits approval, read-only
  // once delivered. The same `report` state backs it, so edits here and in the modal stay in step.
  const fullView = (icon) => report && (
    <button type="button" className="icon-btn prof-fs-btn" onClick={() => setFullscreen(true)} title="Open full screen">{icon} Full screen</button>
  );
  const expandIcon = <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>;

  return (
    <div className="prof-body">
      <section>
        <h4>Details</h4>
        <Row label="Email">{p.email}</Row>
        <Row label="Phone">{p.phone}</Row>
        <Row label="Joined">{fmtDate(p.createdAt)}</Row>
        <Row label="Cancer type">{p.cancerType}</Row>
        <Row label="Assigned doctor">{p.doctor}</Row>
        <Row label="Portal login">{d.hasPassword ? 'Set up' : 'Not set up yet'}</Row>
      </section>

      <section>
        <h4>Documents ({d.counts.documents})</h4>
        {!d.documents.length && <p className="cns-muted">Nothing uploaded yet.</p>}
        <ul className="prof-list">
          {d.documents.map((doc) => (
            <li key={doc.id}>
              <span>{doc.type || 'Document'} · {doc.date || fmtDate(doc.createdAt)}</span>
              <span className="prof-list-right">
                <span className={'adm-badge ' + (doc.status === 'Reviewed' ? 'green' : 'amber')}>{doc.status}</span>
                {doc.fileUrl && <a className="icon-btn" href={doc.fileUrl} target="_blank" rel="noreferrer">View</a>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4>Case</h4>
        {!k && <p className="cns-muted">No case has been opened for this patient.</p>}
        {k && (
          <>
            <Row label="Status">{k.status}</Row>
            <Row label="Priority">{k.priority}</Row>
            <Row label="Triaged by">{k.counsellor}</Row>
            <Row label="Specialist">{k.expert}</Row>
            <Row label="Opinion sent">{k.deliveredAt ? fmtWhen(k.deliveredAt) : 'Not sent'}</Row>
            {k.patientQuestions && (
              <>
                <h5>What the patient asked</h5>
                <pre className="cns-ai">{k.patientQuestions}</pre>
              </>
            )}
            {k.counsellorReport && (
              <>
                <h5>Counsellor&rsquo;s assessment <em>(internal)</em></h5>
                <pre className="cns-ai">{k.counsellorReport}</pre>
              </>
            )}
            {pending ? (
              <>
                <div className="prof-report-head">
                  <h5>Doctor&rsquo;s report <em>— awaiting your approval</em></h5>
                  {fullView(expandIcon)}
                </div>
                <p className="cns-muted">{k.expert || 'The specialist'} submitted this. Review it, edit any section if needed, then send it to the patient.</p>
                {report ? (
                  <div className="prof-report-frame">
                    <OpinionReport data={report} editable onChange={setReport}
                      patient={{ name: p.name, age: p.age, gender: p.gender }} caseId={p.uhid} doctor={k.expert} date={new Date()} />
                  </div>
                ) : (
                  <pre className="cns-ai">{k.doctorOpinion || 'No report content was submitted.'}</pre>
                )}
                <div className="cns-row" style={{ marginTop: '.6rem' }}>
                  <button type="button" className="doc-btn doc-btn-outline" disabled={busy === 'save' || busy === 'send' || !report} onClick={saveEdits}>{busy === 'save' ? 'Saving…' : 'Save edits'}</button>
                  <button type="button" className="doc-btn doc-btn-primary" disabled={busy === 'send'} onClick={sendToPatient}>{busy === 'send' ? 'Sending…' : 'Send to patient'}</button>
                </div>
                {note && <p className="cns-muted" style={{ marginTop: '.4rem' }}>{note}</p>}
              </>
            ) : (report || k.doctorOpinion) ? (
              <>
                <div className="prof-report-head">
                  <h5>Doctor&rsquo;s report{k.deliveredAt ? ` (sent ${fmtWhen(k.deliveredAt)})` : ' (draft — not submitted)'}</h5>
                  {fullView(expandIcon)}
                </div>
                {report
                  ? <div className="prof-report-frame"><OpinionReport data={report} patient={{ name: p.name, age: p.age, gender: p.gender }} caseId={p.uhid} doctor={k.expert} date={k.deliveredAt} /></div>
                  : <pre className="cns-ai">{k.doctorOpinion}</pre>}
              </>
            ) : null}

            {fullscreen && report && (
              <div className="orp-fs" role="dialog" aria-label="Report full screen">
                <div className="orp-fs-bar">
                  <strong>Second-opinion report — {p.name}</strong>
                  <span className="orp-fs-actions">
                    {pending ? (
                      <>
                        <button type="button" className="doc-btn doc-btn-outline" disabled={busy === 'save' || busy === 'send'} onClick={saveEdits}>{busy === 'save' ? 'Saving…' : 'Save edits'}</button>
                        <button type="button" className="doc-btn doc-btn-primary" disabled={busy === 'send'} onClick={sendToPatient}>{busy === 'send' ? 'Sending…' : 'Send to patient'}</button>
                      </>
                    ) : (
                      <button type="button" className="doc-btn doc-btn-outline" onClick={() => window.print()}>Print / Save as PDF</button>
                    )}
                    <button type="button" className="doc-btn doc-btn-ghost" onClick={() => setFullscreen(false)}>Exit full screen</button>
                  </span>
                </div>
                <div className="orp-fs-body">
                  <OpinionReport data={report} editable={pending} onChange={setReport}
                    patient={{ name: p.name, age: p.age, gender: p.gender }} caseId={p.uhid} doctor={k.expert} date={pending ? new Date() : k.deliveredAt} />
                </div>
                {note && <p className="orp-fs-note">{note}</p>}
              </div>
            )}
          </>
        )}
      </section>

      <section>
        <h4>Conversation ({d.counts.messages})</h4>
        {!d.messages.length && <p className="cns-muted">No messages yet.</p>}
        <div className="prof-thread">
          {d.messages.map((m) => (
            <div key={m.id} className={'doc-msg ' + (m.sender === 'patient' ? 'from-patient' : 'from-care')}>
              <span className="doc-msg-who">
                {m.sender === 'patient' ? p.name : (m.author || 'Care team')}
                <em>{fmtWhen(m.createdAt)}</em>
              </span>
              <p>{m.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StaffBody({ d }) {
  const s = d.staff;
  const c = d.counts;
  return (
    <div className="prof-body">
      <section>
        <h4>Details</h4>
        <Row label="Email">{s.email}</Row>
        <Row label="Phone">{s.phone}</Row>
        <Row label="Status">{s.status}</Row>
        <Row label="Qualifications">{s.qualifications}</Row>
        <Row label="Portal login">{d.hasPassword ? 'Set up' : 'Not set up yet — send them a login'}</Row>
        <Row label="Handles">{d.categories.length ? d.categories.join(', ') : 'No categories — will never be assigned a report'}</Row>
      </section>

      <section>
        <h4>Workload</h4>
        <div className="prof-stats">
          <div><strong>{c.patients}</strong><span>Patients</span></div>
          <div><strong>{c.pending}</strong><span>Documents pending</span></div>
          <div><strong>{c.reviewed}</strong><span>Documents reviewed</span></div>
          <div><strong>{c.delivered}</strong><span>Opinions sent</span></div>
          {c.triaged > 0 && <div><strong>{c.triaged}</strong><span>Cases triaged</span></div>}
        </div>
      </section>

      <section>
        <h4>Their patients ({d.patients.length})</h4>
        {!d.patients.length && <p className="cns-muted">No patients assigned.</p>}
        <ul className="prof-list">
          {d.patients.map((p) => (
            <li key={p.id}>
              <span>{p.name} <span className="mono cns-muted">{p.uhid}</span></span>
              <span className="prof-list-right">{p.cancerType || '—'}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
