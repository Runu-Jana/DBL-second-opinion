// The doctor's tick-box intake — the whole point of the new flow. The specialist makes the
// clinical decisions here in a minute of ticking; the AI turns those decisions, the counsellor's
// assessment and the document readings into the full report. Nothing here is free-writing except
// one optional note at the end.
//
// The shape produced matches what server/lib/reportComposer.js reads (see intakeText there).

const MORE_TESTS = ['Repeat biopsy / IHC', 'PET-CT', 'MRI', 'Molecular / genetic profiling', 'Tumour markers', 'Bone scan'];
const TREATMENTS = ['Surgery done', 'Chemotherapy ongoing', 'Radiotherapy', 'Targeted therapy', 'Immunotherapy', 'No treatment started', 'Palliative care'];
const RECOMMENDATIONS = [
  'Continue the current treatment plan',
  'Proceed with / complete surgery',
  'Begin or continue chemotherapy',
  'Add radiotherapy',
  'Consider targeted or immunotherapy',
  'Obtain molecular / genetic profiling',
  'Nutritional and supportive care',
  'Regular monitoring and follow-up',
  'Discuss at a multidisciplinary tumour board',
  'Second surgical opinion',
];
const FOLLOWUP = ['Tumour-marker monitoring', 'Repeat imaging (CT / PET / MRI)', 'Blood counts before each cycle', 'Endoscopy / colonoscopy after treatment'];
const INTERVALS = ['Every 3 weeks', 'Monthly', 'Every 3 months', 'Every 6 months'];
const TONES = ['Reassuring — plan is appropriate', 'Cautious — changes advised', 'Urgent — act promptly', 'More information needed'];
const STAGES = ['Stage I', 'Stage II', 'Stage III', 'Stage IV', 'Not staged / unclear'];

export const EMPTY_FORM = {
  stage: '', diagnosisAgree: false, histologyConfirms: false, stagingDocumented: false,
  needsMoreTests: false, moreTests: [], currentTreatment: [],
  planAppropriate: false, recommendModification: false, considerAlternatives: false,
  recommendations: [], followUpEvery: '', followUp: [], tone: '', note: '',
};

export default function ReportForm({ form, onChange, onGenerate, busy, generated, disabled }) {
  const f = { ...EMPTY_FORM, ...(form || {}) };
  const set = (patch) => onChange({ ...f, ...patch });
  const toggle = (key, value) => {
    const arr = new Set(f[key] || []);
    arr.has(value) ? arr.delete(value) : arr.add(value);
    set({ [key]: [...arr] });
  };

  const Check = ({ checked, onToggle, children }) => (
    <label className={'rf-check' + (checked ? ' on' : '')}>
      <input type="checkbox" checked={checked} onChange={onToggle} disabled={disabled} />
      <span className="rf-box" aria-hidden="true" />
      <span>{children}</span>
    </label>
  );
  const Chips = ({ options, selected, onPick }) => (
    <div className="rf-chips">
      {options.map((o) => (
        <button type="button" key={o} disabled={disabled} className={'rf-chip' + ((selected || []).includes(o) ? ' on' : '')} onClick={() => onPick(o)}>{o}</button>
      ))}
    </div>
  );

  return (
    <div className="rf">
      <div className="rf-grid">
        <section className="rf-sec">
          <h4>1 · Diagnosis</h4>
          <Check checked={f.diagnosisAgree} onToggle={() => set({ diagnosisAgree: !f.diagnosisAgree })}>I agree with the stated diagnosis</Check>
          <Check checked={f.histologyConfirms} onToggle={() => set({ histologyConfirms: !f.histologyConfirms })}>Histopathology confirms the cancer type</Check>
          <Check checked={f.stagingDocumented} onToggle={() => set({ stagingDocumented: !f.stagingDocumented })}>Staging is adequately documented</Check>
          <label className="rf-inline">Stage
            <select value={f.stage} disabled={disabled} onChange={(e) => set({ stage: e.target.value })}>
              <option value="">—</option>
              {STAGES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <Check checked={f.needsMoreTests} onToggle={() => set({ needsMoreTests: !f.needsMoreTests, moreTests: f.needsMoreTests ? [] : f.moreTests })}>Further tests are needed</Check>
          {f.needsMoreTests && <Chips options={MORE_TESTS} selected={f.moreTests} onPick={(o) => toggle('moreTests', o)} />}
        </section>

        <section className="rf-sec">
          <h4>2 · Current treatment</h4>
          <Chips options={TREATMENTS} selected={f.currentTreatment} onPick={(o) => toggle('currentTreatment', o)} />
          <div className="rf-divider" />
          <Check checked={f.planAppropriate} onToggle={() => set({ planAppropriate: !f.planAppropriate })}>The current plan is appropriate (NCCN / ESMO / ASCO)</Check>
          <Check checked={f.recommendModification} onToggle={() => set({ recommendModification: !f.recommendModification })}>I recommend modifying the plan</Check>
          <Check checked={f.considerAlternatives} onToggle={() => set({ considerAlternatives: !f.considerAlternatives })}>Alternative options should be considered</Check>
        </section>

        <section className="rf-sec rf-sec-wide">
          <h4>3 · Recommendations</h4>
          <Chips options={RECOMMENDATIONS} selected={f.recommendations} onPick={(o) => toggle('recommendations', o)} />
        </section>

        <section className="rf-sec">
          <h4>4 · Follow-up</h4>
          <label className="rf-inline">Review with oncologist
            <select value={f.followUpEvery} disabled={disabled} onChange={(e) => set({ followUpEvery: e.target.value })}>
              <option value="">—</option>
              {INTERVALS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <Chips options={FOLLOWUP} selected={f.followUp} onPick={(o) => toggle('followUp', o)} />
        </section>

        <section className="rf-sec">
          <h4>5 · Overall tone</h4>
          <div className="rf-radios">
            {TONES.map((t) => (
              <label key={t} className={'rf-radio' + (f.tone === t ? ' on' : '')}>
                <input type="radio" name="rf-tone" checked={f.tone === t} disabled={disabled} onChange={() => set({ tone: t })} />
                <span>{t}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="rf-sec rf-sec-wide">
          <h4>6 · Anything specific to add <em>(optional)</em></h4>
          <textarea className="rf-note" rows={2} value={f.note} disabled={disabled} placeholder="One or two points the AI should weave in — leave blank if none." onChange={(e) => set({ note: e.target.value })} />
        </section>
      </div>

      <div className="rf-actions">
        <p className="rf-hint">The patient&rsquo;s own questions are already included — the AI answers each one. Review everything it produces before submitting.</p>
        <button type="button" className="doc-btn doc-btn-primary rf-generate" disabled={disabled || busy} onClick={onGenerate}>
          {busy ? 'Building the report…' : generated ? '↻ Regenerate report' : '✨ Generate report with AI'}
        </button>
      </div>
    </div>
  );
}
