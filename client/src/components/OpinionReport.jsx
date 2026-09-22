// The second-opinion report, rendered in the DBL "Cancer Care Review Report" house style.
//
// One component, two modes. In read-only mode (patient view, print) it renders exactly what it is
// given and quietly drops any empty section. In editable mode (the doctor building it, the admin
// approving it) every narrative field is a textarea and every table has editable rows you can add
// to or remove — so correcting the AI's draft is direct, and the doctor never faces a blank page.
//
// It renders from the structured `data` shape produced by server/lib/reportComposer.js.
//
// Note on structure: the little section builders (field, page, editList…) are plain FUNCTIONS
// called as `{field(...)}`, not `<Field/>` components. That matters — a component defined inside
// the render would be a new type every keystroke and remount its inputs, losing focus. Called as
// functions, their elements reconcile in place and the one stateful child (Grow) keeps focus.
import { useRef, useEffect } from 'react';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Shield = (
  <svg viewBox="0 0 32 32"><path d="M16 3 26.5 6.2V13.8C26.5 21.2 21.9 26.2 16 29 10.1 26.2 5.5 21.2 5.5 13.8V6.2Z" fill="currentColor" /><rect x="14.3" y="9.6" width="3.4" height="11" rx="1" fill="#fff" /><rect x="10.5" y="13.4" width="11" height="3.4" rx="1" fill="#fff" /></svg>
);
const I = {
  info: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>,
  target: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></svg>,
  layers: <svg viewBox="0 0 24 24" {...s}><path d="m12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5" /></svg>,
  diag: <svg viewBox="0 0 24 24" {...s}><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg>,
  history: <svg viewBox="0 0 24 24" {...s}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 4v4h4M12 8v4l3 2" /></svg>,
  syringe: <svg viewBox="0 0 24 24" {...s}><path d="m18 2 4 4M17 3l4 4-9 9-4 1 1-4 8-8ZM12 8l4 4" /></svg>,
  pill: <svg viewBox="0 0 24 24" {...s}><rect x="3" y="8" width="18" height="8" rx="4" /><path d="M12 8v8" /></svg>,
  doc: <svg viewBox="0 0 24 24" {...s}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M9.5 12h5M9.5 15h5" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4 10-10" /></svg>,
  clip: <svg viewBox="0 0 24 24" {...s}><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4h6v3H9zM9 12l1.5 1.5L14 10" /></svg>,
  gauge: <svg viewBox="0 0 24 24" {...s}><path d="M4 15a8 8 0 1 1 16 0" /><path d="m12 15 4-3" /></svg>,
  alert: <svg viewBox="0 0 24 24" {...s}><path d="M12 3 2 20h20L12 3ZM12 10v4M12 17h.01" /></svg>,
  shield: <svg viewBox="0 0 24 24" {...s}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>,
  chat: <svg viewBox="0 0 24 24" {...s}><path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1Z" /></svg>,
  cal: <svg viewBox="0 0 24 24" {...s}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>,
  heart: <svg viewBox="0 0 24 24" {...s}><path d="M12 20s-7-4.4-9.2-9.1C1.3 7.7 3 4.8 6 4.8c1.9 0 3.2 1.1 4 2.3.8-1.2 2.1-2.3 4-2.3 3 0 4.7 2.9 3.2 6.1C19 15.6 12 20 12 20Z" /></svg>,
  activity: <svg viewBox="0 0 24 24" {...s}><path d="M3 12h4l2 6 4-12 2 6h6" /></svg>,
  lock: <svg viewBox="0 0 24 24" {...s}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>,
};

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }));
const hasText = (v) => typeof v === 'string' && v.trim().length > 0;

// Whether the browser sizes a textarea to its content natively (Chrome/Edge). When it does we let
// CSS `field-sizing: content` do the growing and never touch the height in JS — a stray inline
// height would fight the native sizing and bring the scrollbar back.
const NATIVE_SIZING = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('field-sizing', 'content');

// A textarea that grows with its content, so a long field never hides text behind a scrollbar.
// Top-level (stable type) so it keeps focus while the parent report re-renders on each edit.
function Grow({ value, onChange, placeholder, rows = 2 }) {
  const ref = useRef(null);
  const size = () => { if (NATIVE_SIZING) return; const el = ref.current; if (!el) return; el.style.height = 'auto'; el.style.height = `${Math.max(34, el.scrollHeight)}px`; };
  useEffect(size, [value]);
  return <textarea ref={ref} className="orp-edit" rows={rows} value={value || ''} placeholder={placeholder}
    onChange={(e) => { onChange(e.target.value); size(); }} />;
}

export default function OpinionReport({ data, patient = {}, caseId, doctor, date, editable = false, onChange }) {
  const d = data || {};
  const header = d.header || {};
  const so = d.secondOpinion || {};
  const ph = d.pharmacy || {};
  const inter = d.interactions || {};
  const fu = d.followUp || {};
  const sup = d.supportive || {};

  // Every edit produces a whole new object, so the parent holds one source of truth and re-renders.
  const set = (patch) => onChange && onChange({ ...d, ...patch });
  const setIn = (key, patch) => set({ [key]: { ...(d[key] || {}), ...patch } });
  const setRow = (key, i, patch) => { const a = [...(d[key] || [])]; a[i] = { ...a[i], ...patch }; set({ [key]: a }); };
  const addRow = (key, blank) => set({ [key]: [...(d[key] || []), blank] });
  const delRow = (key, i) => { const a = [...(d[key] || [])]; a.splice(i, 1); set({ [key]: a }); };
  const setList = (key, i, v) => { const a = [...(d[key] || [])]; a[i] = v; set({ [key]: a }); };
  const addItem = (key) => set({ [key]: [...(d[key] || []), ''] });
  const delItem = (key, i) => { const a = [...(d[key] || [])]; a.splice(i, 1); set({ [key]: a }); };
  // Nested arrays: interactions.minor, followUp.schedule, supportive.medications.
  const setRow2 = (key, sub, i, patch) => { const p = { ...(d[key] || {}) }; const a = [...(p[sub] || [])]; a[i] = { ...a[i], ...patch }; set({ [key]: { ...p, [sub]: a } }); };
  const addRow2 = (key, sub, blank) => { const p = { ...(d[key] || {}) }; set({ [key]: { ...p, [sub]: [...(p[sub] || []), blank] } }); };
  const delRow2 = (key, sub, i) => { const p = { ...(d[key] || {}) }; const a = [...(p[sub] || [])]; a.splice(i, 1); set({ [key]: { ...p, [sub]: a } }); };
  const setItem2 = (key, sub, i, v) => { const p = { ...(d[key] || {}) }; const a = [...(p[sub] || [])]; a[i] = v; set({ [key]: { ...p, [sub]: a } }); };

  const addBtn = (onClick, label) => <button type="button" className="orp-add no-print" onClick={onClick}>+ {label}</button>;
  const delBtn = (onClick) => <button type="button" className="orp-del no-print" title="Remove" onClick={onClick}>×</button>;

  // A labelled narrative field. Editable → grow-textarea; read → hidden entirely when empty.
  const field = (icon, label, value, onEdit) => {
    if (!editable && !hasText(value)) return null;
    return (
      <div className="rp-field" key={label}><span className="rp-field-ico">{icon}</span>
        <div><h4>{label}</h4>{editable ? <Grow value={value} onChange={onEdit} placeholder={`${label}…`} /> : <p>{value}</p>}</div>
      </div>
    );
  };

  // A page wrapper that hides itself in read mode when it has no content to show.
  const page = (num, title, { prep, show = true } = {}, children) => {
    if (!editable && !show) return null;
    return (
      <section className="rp-page" key={num}>
        <div className="rp-top"><span className="rp-brand">{Shield}<b>DBL <em>INTERNATIONAL</em></b></span><span className="rp-conf">Confidential — For Review Use Only</span></div>
        <div className="rp-title"><span className="n">{num}</span><h2>{title}</h2></div>
        {prep && <p className="rp-prep">Prepared by: {prep}</p>}
        {children}
        <div className="rp-foot"><span>Case ID: {caseId || '—'} · {patient.name || ''}</span><span className="rp-page-no">{num}</span></div>
      </section>
    );
  };

  // A bulleted list bound to a top-level array field (recommendations, nextSteps, reportsReviewed).
  const editList = (k, addLabel) => (
    <>
      <ul className="rp-list">
        {(d[k] || []).map((x, i) => (
          <li key={i}><span className="rp-tick">{I.check}</span>
            {editable ? <><Grow value={x} onChange={(v) => setList(k, i, v)} /> {delBtn(() => delItem(k, i))}</> : x}
          </li>
        ))}
      </ul>
      {editable && addBtn(() => addItem(k), addLabel)}
    </>
  );

  // A bulleted list bound to a nested array field (followUp.lifestyle, interactions.considerations).
  const nestedList = (k, sub) => {
    const arr = (d[k] || {})[sub] || [];
    return (
      <>
        <ul className="rp-list">
          {arr.map((x, i) => (
            <li key={i}><span className="rp-tick">{I.check}</span>
              {editable ? <><Grow value={x} onChange={(v) => setItem2(k, sub, i, v)} /> {delBtn(() => delRow2(k, sub, i))}</> : x}
            </li>
          ))}
        </ul>
        {editable && addBtn(() => addRow2(k, sub, ''), 'Add')}
      </>
    );
  };

  const reviewed = d.reportsReviewed || [];
  const meds = d.medications || [];
  const invs = d.investigations || [];
  const sides = d.sideEffects || [];
  const recs = d.recommendations || [];
  const steps = d.nextSteps || [];
  const answers = d.answers || [];
  const costs = d.costs || [];
  const sched = fu.schedule || [];
  const life = fu.lifestyle || [];
  const supMeds = sup.medications || [];
  const minor = inter.minor || [];
  const considerations = inter.considerations || [];

  const anyPharmacy = [ph.medicationReview, ph.chemoAssessment, ph.doseReview, ph.interactionAnalysis, ph.sideEffectManagement, ph.supportiveCare, ph.safety, ph.counseling].some(hasText);
  const anySupportive = [sup.nutrition, sup.psychological, sup.physical, sup.infection].some(hasText) || supMeds.length > 0;
  const anyFollow = sched.length > 0 || life.length > 0;

  return (
    <div className="report orp-report">
      {/* 1 — COVER */}
      <section className="rp-page rp-cover">
        <div className="rp-cover-inner">
          <div className="rp-cover-brand">{Shield}<div><b>DBL <em>INTERNATIONAL</em></b><span>Clinical Oncology Pharmacy &amp; Cancer Second Opinion Centre</span></div></div>
          <div className="rp-cover-shield">{Shield}</div>
          <div className="rp-cover-title"><h1>Cancer Care<br />Review Report</h1><p className="rp-cover-tags">Evidence Based &nbsp;•&nbsp; Expert Reviewed &nbsp;•&nbsp; Patient Focused</p></div>
          <div className="rp-cover-info">
            <div className="rp-ci"><span>Patient Name</span><strong>{patient.name || '—'}</strong></div>
            <div className="rp-ci"><span>Age / Gender</span><strong>{[patient.age, patient.gender].filter(Boolean).join(' / ') || '—'}</strong></div>
            <div className="rp-ci"><span>Case ID</span><strong>{caseId || '—'}</strong></div>
            <div className="rp-ci"><span>Report Date</span><strong>{fmtDate(date)}</strong></div>
            <div className="rp-ci" style={{ gridColumn: '1 / -1' }}><span>Service Type</span><strong>{header.service || 'Medical Second Opinion & Clinical Oncology Review'}</strong></div>
          </div>
          <div className="rp-cover-conf">{I.lock} CONFIDENTIAL — For Review Use Only</div>
        </div>
      </section>

      {/* 2 — PATIENT SUMMARY */}
      {page('2', 'Patient Summary', {}, <>
        <div className="rp-two">
          {field(I.info, 'Chief Complaint', header.chiefComplaint, (v) => setIn('header', { chiefComplaint: v }))}
          {field(I.diag, 'Cancer Type', header.cancerType, (v) => setIn('header', { cancerType: v }))}
          {field(I.layers, 'Stage', header.stage, (v) => setIn('header', { stage: v }))}
          {field(I.target, 'Diagnosis', header.diagnosis, (v) => setIn('header', { diagnosis: v }))}
          {field(I.history, 'Previous Treatment', header.prevTreatment, (v) => setIn('header', { prevTreatment: v }))}
          {field(I.syringe, 'Current Treatment', header.currentTreatment, (v) => setIn('header', { currentTreatment: v }))}
        </div>
        {(editable || reviewed.length > 0) && <><p className="rp-sub">Reports Reviewed</p>{editList('reportsReviewed', 'Add a report')}</>}
      </>)}

      {/* 3 — MEDICAL SECOND OPINION (the core) */}
      {page('3', 'Medical Second Opinion', { prep: doctor || 'Medical Oncologist (Expert Panel)' }, <>
        <div className="rp-fields">
          {field(I.diag, 'Review of Diagnosis', so.diagnosisReview, (v) => setIn('secondOpinion', { diagnosisReview: v }))}
          {field(I.doc, 'Review of Investigations', so.investigationsReview, (v) => setIn('secondOpinion', { investigationsReview: v }))}
          {field(I.clip, 'Review of Treatment Plan', so.treatmentReview, (v) => setIn('secondOpinion', { treatmentReview: v }))}
          {field(I.layers, 'Alternative Treatment Options', so.alternatives, (v) => setIn('secondOpinion', { alternatives: v }))}
          {field(I.gauge, 'Additional Tests (if any)', so.additionalTests, (v) => setIn('secondOpinion', { additionalTests: v }))}
          {field(I.check, 'Overall Clinical Opinion', so.overallOpinion, (v) => setIn('secondOpinion', { overallOpinion: v }))}
        </div>
      </>)}

      {/* 4 — ANSWERS TO THE PATIENT'S QUESTIONS */}
      {(editable || answers.length > 0) && page('4', 'Answers to Your Questions', {}, <>
        <div className="rp-qa">
          {answers.map((a, i) => (
            <div className="rp-qa-item" key={i}>
              {editable ? <>
                <input className="orp-edit orp-q" value={a.question || ''} placeholder="The question…" onChange={(e) => setRow('answers', i, { question: e.target.value })} />
                <Grow value={a.answer} onChange={(v) => setRow('answers', i, { answer: v })} placeholder="The answer…" />
                {delBtn(() => delRow('answers', i))}
              </> : <>
                <p className="rp-qa-q">{I.chat} {a.question}</p>
                <p className="rp-qa-a">{a.answer}</p>
              </>}
            </div>
          ))}
        </div>
        {editable && addBtn(() => addRow('answers', { question: '', answer: '' }), 'Add a question & answer')}
      </>)}

      {/* 5 — CLINICAL ONCOLOGY PHARMACY REVIEW */}
      {page('5', 'Clinical Oncology Pharmacy Review', { show: anyPharmacy }, <>
        <div className="rp-fields">
          {field(I.pill, 'Current Medication Review', ph.medicationReview, (v) => setIn('pharmacy', { medicationReview: v }))}
          {field(I.syringe, 'Chemotherapy Medication Assessment', ph.chemoAssessment, (v) => setIn('pharmacy', { chemoAssessment: v }))}
          {field(I.gauge, 'Dose Review', ph.doseReview, (v) => setIn('pharmacy', { doseReview: v }))}
          {field(I.alert, 'Drug Interaction Analysis', ph.interactionAnalysis, (v) => setIn('pharmacy', { interactionAnalysis: v }))}
          {field(I.shield, 'Side Effect Management Guidance', ph.sideEffectManagement, (v) => setIn('pharmacy', { sideEffectManagement: v }))}
          {field(I.clip, 'Supportive Care Review', ph.supportiveCare, (v) => setIn('pharmacy', { supportiveCare: v }))}
          {field(I.info, 'Medication Safety Considerations', ph.safety, (v) => setIn('pharmacy', { safety: v }))}
          {field(I.chat, 'Counseling Points', ph.counseling, (v) => setIn('pharmacy', { counseling: v }))}
        </div>
      </>)}

      {/* 6 — MEDICATION REVIEW SUMMARY */}
      {page('6', 'Medication Review Summary', { show: meds.length > 0 }, <>
        <table className="rp-table">
          <thead><tr><th>Medication</th><th>Dose &amp; Frequency</th><th>Purpose</th><th>Status</th>{editable && <th className="no-print" />}</tr></thead>
          <tbody>
            {meds.map((m, i) => (
              <tr key={i}>
                {editable ? <>
                  <td><input className="orp-cell" value={m.name || ''} onChange={(e) => setRow('medications', i, { name: e.target.value })} /></td>
                  <td><input className="orp-cell" value={m.dose || ''} onChange={(e) => setRow('medications', i, { dose: e.target.value })} /></td>
                  <td><input className="orp-cell" value={m.purpose || ''} onChange={(e) => setRow('medications', i, { purpose: e.target.value })} /></td>
                  <td><input className="orp-cell" value={m.status || ''} onChange={(e) => setRow('medications', i, { status: e.target.value })} /></td>
                  <td className="no-print">{delBtn(() => delRow('medications', i))}</td>
                </> : <>
                  <td><b>{m.name}</b></td><td>{m.dose}</td><td>{m.purpose}</td><td><span className="rp-ok">{m.status || 'Appropriate'}</span></td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
        {editable && addBtn(() => addRow('medications', { name: '', dose: '', purpose: '', status: 'Appropriate' }), 'Add a medication')}
      </>)}

      {/* 7 — DRUG INTERACTION ANALYSIS */}
      {page('7', 'Drug Interaction Analysis', { show: minor.length > 0 || considerations.length > 0 || inter.major }, <>
        {editable && <label className="orp-check no-print"><input type="checkbox" checked={!!inter.major} onChange={(e) => setIn('interactions', { major: e.target.checked })} /> A major interaction is present</label>}
        {!inter.major
          ? <div className="rp-good">{I.check}<b>No major drug interactions identified — the current medications are generally safe when taken together.</b></div>
          : <div className="rp-note">{I.alert}<span><b>A major interaction was flagged — see the recommendation below.</b></span></div>}
        {(editable || minor.length > 0) && <>
          <p className="rp-sub">Interactions to Watch</p>
          <table className="rp-table">
            <thead><tr><th>Drug Combination</th><th>Risk</th><th>Recommendation</th>{editable && <th className="no-print" />}</tr></thead>
            <tbody>
              {minor.map((m, i) => (
                <tr key={i}>
                  {editable ? <>
                    <td><input className="orp-cell" value={m.combo || ''} onChange={(e) => setRow2('interactions', 'minor', i, { combo: e.target.value })} /></td>
                    <td><input className="orp-cell" value={m.risk || ''} onChange={(e) => setRow2('interactions', 'minor', i, { risk: e.target.value })} /></td>
                    <td><input className="orp-cell" value={m.recommendation || ''} onChange={(e) => setRow2('interactions', 'minor', i, { recommendation: e.target.value })} /></td>
                    <td className="no-print">{delBtn(() => delRow2('interactions', 'minor', i))}</td>
                  </> : <>
                    <td>{m.combo}</td><td>{m.risk}</td><td>{m.recommendation}</td>
                  </>}
                </tr>
              ))}
            </tbody>
          </table>
          {editable && addBtn(() => addRow2('interactions', 'minor', { combo: '', risk: '', recommendation: '' }), 'Add an interaction')}
        </>}
        {(editable || considerations.length > 0) && <><p className="rp-sub">Other Considerations</p>{nestedList('interactions', 'considerations')}</>}
      </>)}

      {/* 8 — TREATMENT RECOMMENDATIONS */}
      {page('8', 'Treatment Recommendations', { show: recs.length > 0 }, editList('recommendations', 'Add a recommendation'))}

      {/* 9 — INVESTIGATION SUMMARY */}
      {page('9', 'Investigation Summary', { show: invs.length > 0 }, <>
        <table className="rp-table">
          <thead><tr><th>Investigation</th><th>Date</th><th>Findings</th><th>Interpretation</th>{editable && <th className="no-print" />}</tr></thead>
          <tbody>
            {invs.map((r, i) => (
              <tr key={i}>
                {editable ? <>
                  <td><input className="orp-cell" value={r.name || ''} onChange={(e) => setRow('investigations', i, { name: e.target.value })} /></td>
                  <td><input className="orp-cell" value={r.date || ''} onChange={(e) => setRow('investigations', i, { date: e.target.value })} /></td>
                  <td><input className="orp-cell" value={r.findings || ''} onChange={(e) => setRow('investigations', i, { findings: e.target.value })} /></td>
                  <td><input className="orp-cell" value={r.interpretation || ''} onChange={(e) => setRow('investigations', i, { interpretation: e.target.value })} /></td>
                  <td className="no-print">{delBtn(() => delRow('investigations', i))}</td>
                </> : <>
                  <td><b>{r.name}</b></td><td>{r.date}</td><td>{r.findings}</td><td>{r.interpretation}</td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
        {editable && addBtn(() => addRow('investigations', { name: '', date: '', findings: '', interpretation: '' }), 'Add an investigation')}
      </>)}

      {/* 10 — SIDE EFFECT MONITORING PLAN */}
      {page('10', 'Side Effect Monitoring Plan', { show: sides.length > 0 }, <>
        <table className="rp-table">
          <thead><tr><th>Potential Side Effect</th><th>Monitoring</th><th>Management</th>{editable && <th className="no-print" />}</tr></thead>
          <tbody>
            {sides.map((r, i) => (
              <tr key={i}>
                {editable ? <>
                  <td><input className="orp-cell" value={r.effect || ''} onChange={(e) => setRow('sideEffects', i, { effect: e.target.value })} /></td>
                  <td><input className="orp-cell" value={r.monitoring || ''} onChange={(e) => setRow('sideEffects', i, { monitoring: e.target.value })} /></td>
                  <td><input className="orp-cell" value={r.management || ''} onChange={(e) => setRow('sideEffects', i, { management: e.target.value })} /></td>
                  <td className="no-print">{delBtn(() => delRow('sideEffects', i))}</td>
                </> : <>
                  <td><b>{r.effect}</b></td><td>{r.monitoring}</td><td>{r.management}</td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
        {editable && addBtn(() => addRow('sideEffects', { effect: '', monitoring: '', management: '' }), 'Add a side effect')}
      </>)}

      {/* 11 — FOLLOW-UP & SURVEILLANCE PLAN */}
      {page('11', 'Follow-up & Surveillance Plan', { show: anyFollow }, <>
        {(editable || sched.length > 0) && <>
          <p className="rp-sub">Schedule</p>
          <div className="rp-fields">
            {sched.map((r, i) => (
              <div className="rp-field" key={i}><span className="rp-field-ico">{I.cal}</span>
                <div>{editable ? <div className="orp-inline">
                  <input className="orp-cell" value={r.item || ''} placeholder="What" onChange={(e) => setRow2('followUp', 'schedule', i, { item: e.target.value })} />
                  <input className="orp-cell" value={r.when || ''} placeholder="When" onChange={(e) => setRow2('followUp', 'schedule', i, { when: e.target.value })} />
                  {delBtn(() => delRow2('followUp', 'schedule', i))}
                </div> : <><h4>{r.item}</h4><p>{r.when}</p></>}</div>
              </div>
            ))}
          </div>
          {editable && addBtn(() => addRow2('followUp', 'schedule', { item: '', when: '' }), 'Add a schedule item')}
        </>}
        {(editable || life.length > 0) && <><p className="rp-sub">Lifestyle Advice</p>{nestedList('followUp', 'lifestyle')}</>}
      </>)}

      {/* 12 — SUPPORTIVE CARE PLAN */}
      {page('12', 'Supportive Care Plan', { show: anySupportive }, <>
        <div className="rp-fields">
          {field(I.heart, 'Nutrition Support', sup.nutrition, (v) => setIn('supportive', { nutrition: v }))}
          {field(I.chat, 'Psychological Support', sup.psychological, (v) => setIn('supportive', { psychological: v }))}
          {field(I.activity, 'Physical Activity', sup.physical, (v) => setIn('supportive', { physical: v }))}
          {field(I.shield, 'Infection Prevention', sup.infection, (v) => setIn('supportive', { infection: v }))}
        </div>
        {(editable || supMeds.length > 0) && <>
          <p className="rp-sub">Supportive Medications</p>
          <div className="rp-fields">
            {supMeds.map((r, i) => (
              <div className="rp-field" key={i}><span className="rp-field-ico">{I.pill}</span>
                <div>{editable ? <div className="orp-inline">
                  <input className="orp-cell" value={r.type || ''} placeholder="Type" onChange={(e) => setRow2('supportive', 'medications', i, { type: e.target.value })} />
                  <input className="orp-cell" value={r.purpose || ''} placeholder="Purpose" onChange={(e) => setRow2('supportive', 'medications', i, { purpose: e.target.value })} />
                  {delBtn(() => delRow2('supportive', 'medications', i))}
                </div> : <><h4>{r.type}</h4><p>{r.purpose}</p></>}</div>
              </div>
            ))}
          </div>
          {editable && addBtn(() => addRow2('supportive', 'medications', { type: '', purpose: '' }), 'Add a supportive medication')}
        </>}
      </>)}

      {/* 13 — NEXT STEPS & CARE COORDINATION */}
      {page('13', 'Next Steps & Care Coordination', { show: steps.length > 0 }, <>
        {editList('nextSteps', 'Add a step')}
        <div className="rp-banner">We are with you in your cancer care journey. You are not alone.</div>
      </>)}

      {/* 14 — COST ESTIMATE SUMMARY */}
      {page('14', 'Cost Estimate Summary (Approx.)', { show: costs.length > 0 }, <>
        <table className="rp-table">
          <thead><tr><th>Description</th><th>Estimated Cost (INR)</th>{editable && <th className="no-print" />}</tr></thead>
          <tbody>
            {costs.map((c, i) => (
              <tr key={i}>
                {editable ? <>
                  <td><input className="orp-cell" value={c.description || ''} onChange={(e) => setRow('costs', i, { description: e.target.value })} /></td>
                  <td><input className="orp-cell" value={c.range || ''} onChange={(e) => setRow('costs', i, { range: e.target.value })} /></td>
                  <td className="no-print">{delBtn(() => delRow('costs', i))}</td>
                </> : <>
                  <td>{c.description}</td><td>₹ {c.range}</td>
                </>}
              </tr>
            ))}
            {(editable || hasText(d.costTotal)) && (
              <tr><td><b>Total Estimated Cost</b></td>
                <td>{editable ? <input className="orp-cell" value={d.costTotal || ''} placeholder="e.g. 56,000 – 80,000" onChange={(e) => set({ costTotal: e.target.value })} /> : <b>₹ {d.costTotal}</b>}</td>
                {editable && <td className="no-print" />}</tr>
            )}
          </tbody>
        </table>
        {editable && addBtn(() => addRow('costs', { description: '', range: '' }), 'Add a cost line')}
        <div className="rp-note">{I.info}<span>Costs may vary depending on hospital and location.</span></div>
      </>)}

      {/* 15 — DISCLAIMER (static chrome) */}
      <section className="rp-page">
        <div className="rp-top"><span className="rp-brand">{Shield}<b>DBL <em>INTERNATIONAL</em></b></span><span className="rp-conf">Confidential — For Review Use Only</span></div>
        <div className="rp-title"><span className="n">15</span><h2>Disclaimer &amp; References</h2></div>
        <p className="rp-sub">Disclaimer</p>
        <p style={{ fontSize: '9.5pt', color: '#33425e', lineHeight: 1.6 }}>This report is based on the medical documents and information provided by the patient. It is a review and advisory service only and does not replace the advice, diagnosis or treatment of a qualified registered medical practitioner. DBL International is not responsible for any decisions made without consulting your treating doctor. In case of any medical emergency, please contact your nearest hospital immediately.</p>
        <p className="rp-sub">Evidence-Based References</p>
        <ul className="rp-list">{['NCCN Clinical Practice Guidelines', 'ESMO Clinical Practice Guidelines', 'ASCO Guidelines', 'Standard Textbooks & Peer-Reviewed Literature'].map((x, i) => <li key={i}><span className="rp-tick">{I.check}</span>{x}</li>)}</ul>
        <div className="rp-foot"><span>Case ID: {caseId || '—'} · {patient.name || ''}</span><span className="rp-page-no">15</span></div>
      </section>
    </div>
  );
}
