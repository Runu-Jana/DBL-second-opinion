import Header from '../components/Header.jsx';

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
  phone: <svg viewBox="0 0 24 24" {...s}><path d="M4 4h4l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 2 6a2 2 0 0 1 2-2Z" /></svg>,
  mail: <svg viewBox="0 0 24 24" {...s}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>,
  globe: <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9S14.5 18.5 12 21C9.5 18.5 8.2 15.3 8.2 12 8.2 8.7 9.5 5.5 12 3Z" /></svg>,
  heart: <svg viewBox="0 0 24 24" {...s}><path d="M12 20s-7-4.4-9.2-9.1C1.3 7.7 3 4.8 6 4.8c1.9 0 3.2 1.1 4 2.3.8-1.2 2.1-2.3 4-2.3 3 0 4.7 2.9 3.2 6.1C19 15.6 12 20 12 20Z" /></svg>,
  activity: <svg viewBox="0 0 24 24" {...s}><path d="M3 12h4l2 6 4-12 2 6h6" /></svg>,
  lock: <svg viewBox="0 0 24 24" {...s}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>,
};

const CASE = {
  patient: 'Rahul Sharma', age: '52 Years', gender: 'Male', caseId: 'DBL-2024-000123', reportDate: '16 May 2024',
  service: 'Clinical Oncology Pharmacy Review + Medical Second Opinion',
  cancerType: 'Carcinoma Colon', diagnosis: 'Adenocarcinoma Colon', stage: 'Stage III (T3N1M0)',
  chiefComplaint: 'Follow up for ongoing chemotherapy and medication review',
  prevTreatment: 'Right Hemicolectomy on 10 Jan 2024. 6 cycles of FOLFOX completed.',
  currentTreatment: 'FOLFOX (Modified) — Cycle 7 to 12 planned',
  reportsReviewed: ['Histopathology Report — 10 Jan 2024', 'CT Scan Report — 20 Feb 2024', 'PET CT Report — 05 Mar 2024', 'Blood Reports — 15 May 2024', 'Treatment Summary — 15 May 2024'],
  medications: [
    ['Oxaliplatin', '85 mg/m² IV, Day 1', 'Chemotherapy'],
    ['Leucovorin', '400 mg/m² IV, Day 1', 'Chemotherapy (Supportive)'],
    ['5-FU', '2400 mg/m² IV, 46 hrs', 'Chemotherapy'],
    ['Ondansetron', '8 mg, 6 hrly', 'Nausea & Vomiting'],
    ['Pantoprazole', '40 mg, OD', 'Gastric Protection'],
    ['Multivitamin', '1 Tablet, OD', 'Nutritional Support'],
    ['Vitamin D3', '60,000 IU, Weekly', 'Vitamin D Deficiency'],
  ],
  investigations: [
    ['Histopathology', '10 Jan 2024', 'Adenocarcinoma Colon', 'Confirmed'],
    ['CT Scan', '20 Feb 2024', 'No distant metastasis', 'No spread'],
    ['PET CT', '05 Mar 2024', 'No FDG avid lesions', 'No spread'],
    ['CBC', '15 May 2024', 'Hb 11.2 g/dL', 'Mild Anaemia'],
    ['LFT', '15 May 2024', 'Within normal limits', 'Normal'],
    ['KFT', '15 May 2024', 'Within normal limits', 'Normal'],
    ['CEA', '15 May 2024', '3.2 ng/mL', 'Within normal range'],
  ],
  sideEffects: [
    ['Nausea / Vomiting', 'During each cycle', 'Antiemetics as advised'],
    ['Neutropenia', 'CBC before each cycle', 'Dose adjustment if needed'],
    ['Neuropathy', 'Clinical assessment', 'Dose modification if severe'],
    ['Diarrhea', 'During treatment', 'Hydration & medication as needed'],
    ['Mucositis', 'Oral examination', 'Oral care & mouthwash'],
    ['Fatigue', 'Patient report', 'Rest, nutrition, light exercise'],
  ],
  costs: [
    ['Chemotherapy (Per Cycle)', '45,000 – 60,000'],
    ['Supportive Medicines (Per Cycle)', '5,000 – 10,000'],
    ['Investigations (Per Cycle)', '5,000 – 8,000'],
    ['Doctor Consultation (Per Visit)', '1,000 – 2,000'],
  ],
};

function RepPage({ num, title, prep, children }) {
  return (
    <section className="rp-page">
      <div className="rp-top">
        <span className="rp-brand">{Shield}<b>DBL <em>INTERNATIONAL</em></b></span>
        <span className="rp-conf">Confidential — For Review Use Only</span>
      </div>
      <div className="rp-title"><span className="n">{num}</span><h2>{title}</h2></div>
      {prep && <p className="rp-prep">Prepared by: {prep}</p>}
      {children}
      <div className="rp-foot"><span>Case ID: {CASE.caseId} · {CASE.patient}</span><span className="rp-page-no">{num}</span></div>
    </section>
  );
}
const Field = ({ icon, label, children }) => (
  <div className="rp-field"><span className="rp-field-ico">{icon}</span><div><h4>{label}</h4><p>{children}</p></div></div>
);
const List = ({ items }) => <ul className="rp-list">{items.map((x, i) => <li key={i}><span className="rp-tick">{I.check}</span>{x}</li>)}</ul>;
const NumList = ({ items }) => <ol className="rp-num-list">{items.map((x, i) => <li key={i}>{x}</li>)}</ol>;

export default function Report() {
  return (
    <>
      <Header active="" />
      <div className="report">
        <div className="rp-toolbar">
          <span>Cancer Care Review Report · {CASE.caseId}</span>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>Print / Save as PDF</button>
        </div>

        {/* 1 — COVER */}
        <section className="rp-page rp-cover">
          <div className="rp-cover-inner">
            <div className="rp-cover-brand">{Shield}<div><b>DBL <em>INTERNATIONAL</em></b><span>Clinical Oncology Pharmacy &amp; Cancer Second Opinion Centre</span></div></div>
            <div className="rp-cover-shield">{Shield}</div>
            <div className="rp-cover-title">
              <h1>Cancer Care<br />Review Report</h1>
              <p className="rp-cover-tags">Evidence Based &nbsp;•&nbsp; Expert Reviewed &nbsp;•&nbsp; Patient Focused</p>
            </div>
            <div className="rp-cover-info">
              <div className="rp-ci"><span>Patient Name</span><strong>{CASE.patient}</strong></div>
              <div className="rp-ci"><span>Age / Gender</span><strong>{CASE.age} / {CASE.gender}</strong></div>
              <div className="rp-ci"><span>Case ID</span><strong>{CASE.caseId}</strong></div>
              <div className="rp-ci"><span>Report Date</span><strong>{CASE.reportDate}</strong></div>
              <div className="rp-ci" style={{ gridColumn: '1 / -1' }}><span>Service Type</span><strong>{CASE.service}</strong></div>
            </div>
            <div className="rp-cover-conf">{I.lock} CONFIDENTIAL — For Review Use Only</div>
          </div>
        </section>

        {/* 2 — PATIENT SUMMARY */}
        <RepPage num="2" title="Patient Summary">
          <div className="rp-two">
            <Field icon={I.info} label="Chief Complaint">{CASE.chiefComplaint}</Field>
            <Field icon={I.diag} label="Cancer Type">{CASE.cancerType}</Field>
            <Field icon={I.layers} label="Stage & Pre-Reported">{CASE.stage}</Field>
            <Field icon={I.target} label="Current Diagnosis">{CASE.diagnosis}</Field>
            <Field icon={I.history} label="Previous Treatment">{CASE.prevTreatment}</Field>
            <Field icon={I.syringe} label="Current Treatment">{CASE.currentTreatment}</Field>
            <Field icon={I.pill} label="Current Medications">See page 5 (Medication Review)</Field>
          </div>
          <p className="rp-sub">Reports Reviewed</p>
          <List items={CASE.reportsReviewed} />
        </RepPage>

        {/* 3 — CLINICAL ONCOLOGY PHARMACY REVIEW */}
        <RepPage num="3" title="Clinical Oncology Pharmacy Review" prep="Dr. Bhoumik Kadhye, Pharm.D">
          <div className="rp-fields">
            <Field icon={I.pill} label="Current Medication Review">All current medications were reviewed for appropriate indication, dose, frequency and duration.</Field>
            <Field icon={I.syringe} label="Chemotherapy Medication Assessment">FOLFOX (Modified) is an appropriate regimen for Stage III Colon Cancer as per standard guidelines.</Field>
            <Field icon={I.gauge} label="Dose Review">Doses are within recommended limits based on BSA and organ function.</Field>
            <Field icon={I.alert} label="Drug Interaction Analysis">No major interactions identified. Minor interaction (Ondansetron) may increase risk of constipation — monitor as needed.</Field>
            <Field icon={I.shield} label="Side Effect Management Guidance">Nausea, cold sensitivity and constipation management advice provided.</Field>
            <Field icon={I.clip} label="Supportive Care Review">Antiemetics, gastroprotection, vitamins and other supportive medications reviewed.</Field>
            <Field icon={I.info} label="Medication Safety Considerations">Hydration and neurotoxicity monitoring recommended.</Field>
            <Field icon={I.chat} label="Counseling Points">Medication adherence, side effects and infection prevention counseling advised.</Field>
          </div>
        </RepPage>

        {/* 4 — MEDICAL SECOND OPINION */}
        <RepPage num="4" title="Medical Second Opinion" prep="Medical Oncologist (Expert Panel)">
          <div className="rp-fields">
            <Field icon={I.diag} label="Review of Diagnosis">Diagnosis of Adenocarcinoma Colon, Stage III, is consistent with reports provided.</Field>
            <Field icon={I.doc} label="Review of Investigations">CT and PET CT findings reviewed. No evidence of distant metastasis.</Field>
            <Field icon={I.clip} label="Review of Treatment Plan">FOLFOX (Modified) for 12 cycles is appropriate as per NCCN/ESMO guidelines.</Field>
            <Field icon={I.layers} label="Alternative Treatment Options">Not required at this stage.</Field>
            <Field icon={I.gauge} label="Additional Tests (if any)">CEA monitoring every 3 months. Colonoscopy after completion of treatment.</Field>
            <Field icon={I.check} label="Overall Clinical Opinion">Current treatment plan is appropriate. Prognosis is good with adherence to treatment and follow up.</Field>
          </div>
        </RepPage>

        {/* 5 — MEDICATION REVIEW SUMMARY */}
        <RepPage num="5" title="Medication Review Summary">
          <table className="rp-table">
            <thead><tr><th>Medication</th><th>Dose & Frequency</th><th>Purpose</th><th>Status</th></tr></thead>
            <tbody>{CASE.medications.map((m, i) => <tr key={i}><td><b>{m[0]}</b></td><td>{m[1]}</td><td>{m[2]}</td><td><span className="rp-ok">Appropriate</span></td></tr>)}</tbody>
          </table>
          <div className="rp-note">{I.info}<span><b>All medications are appropriate.</b> Continue monitoring as per clinical condition.</span></div>
        </RepPage>

        {/* 6 — DRUG INTERACTION ANALYSIS */}
        <RepPage num="6" title="Drug Interaction Analysis">
          <div className="rp-good">{I.check}<b>No major drug interactions identified — the current medications are generally safe when taken together.</b></div>
          <p className="rp-sub">Minor Interaction</p>
          <table className="rp-table">
            <thead><tr><th>Drug Combination</th><th>Risk</th><th>Recommendation</th></tr></thead>
            <tbody><tr><td>Ondansetron + Palonosetron</td><td>May increase risk of constipation</td><td>Monitor bowel habits. Use as needed.</td></tr></tbody>
          </table>
          <p className="rp-sub">Other Considerations</p>
          <List items={['Avoid alcohol during chemotherapy.', 'Maintain adequate hydration.', 'Inform your doctor about all OTC medications and supplements.']} />
        </RepPage>

        {/* 7 — TREATMENT RECOMMENDATIONS */}
        <RepPage num="7" title="Treatment Recommendations">
          <List items={['Continue FOLFOX (Modified) as per current plan.', 'Monitor blood counts before each cycle.', 'Monitor for neuropathy (oxaliplatin related).', 'Maintain hydration and a balanced diet.', 'Regular follow up with treating oncologist.', 'Report immediately if severe side effects occur.', 'Psychological support and physical activity recommended.']} />
        </RepPage>

        {/* 8 — NEXT STEPS & CARE COORDINATION */}
        <RepPage num="8" title="Next Steps & Care Coordination">
          <NumList items={['Continue current treatment and monitoring.', 'Next follow up with Oncologist as per schedule.', 'CEA monitoring every 3 months.', 'Colonoscopy after completion of treatment.', 'DBL Care Manager will assist you with appointment scheduling, hospital coordination (if needed) and treatment-related queries.']} />
          <div className="rp-banner">We are with you in your cancer care journey. You are not alone.</div>
        </RepPage>

        {/* 9 — REVIEWED & SIGNED BY */}
        <RepPage num="9" title="Reviewed & Signed By">
          <div className="rp-fields">
            <Field icon={I.pill} label="Prepared By — Dr. Bhoumik Kadhye, Pharm.D">Clinical Oncology Pharmacist · Reg. No. PHARMAHR/2020/05258 · 16 May 2024 · ✍️ Signed</Field>
            <Field icon={I.diag} label="Reviewed By — Medical Oncologist (Expert Panel)">MBBS, MD (Medical Oncology) · Reg. No. XXXXX · 16 May 2024 · ✍️ Signed</Field>
            <Field icon={I.shield} label="Care Coordinator — DBL International">Care Coordination Team · 16 May 2024 · ✍️ Signed</Field>
          </div>
          <div className="rp-note">{I.info}<span>Digital signatures are applied electronically and verified via the QR code on page 10.</span></div>
        </RepPage>

        {/* 10 — DISCLAIMER & VERIFICATION */}
        <RepPage num="10" title="Disclaimer & Verification">
          <div className="rp-cols3">
            <div>
              <p className="rp-sub">Disclaimer</p>
              <p style={{ fontSize: '9.5pt', color: '#33425e', margin: 0, lineHeight: 1.6 }}>This report is based on the medical documents and information provided by the patient. It is a review and advisory service only and does not replace the advice, diagnosis or treatment of a qualified registered medical practitioner. DBL International is not responsible for any decisions made without consulting your treating doctor. In case of any medical emergency, please contact your nearest hospital immediately.</p>
            </div>
            <div>
              <p className="rp-sub">Verification</p>
              <div className="rp-qr">
                <svg viewBox="0 0 100 100" aria-label="QR code">
                  <rect width="100" height="100" fill="#fff" />
                  <g fill="#0b1f3a">
                    <rect x="6" y="6" width="24" height="24" /><rect x="12" y="12" width="12" height="12" fill="#fff" /><rect x="15" y="15" width="6" height="6" fill="#0b1f3a" />
                    <rect x="70" y="6" width="24" height="24" /><rect x="76" y="12" width="12" height="12" fill="#fff" /><rect x="79" y="15" width="6" height="6" fill="#0b1f3a" />
                    <rect x="6" y="70" width="24" height="24" /><rect x="12" y="76" width="12" height="12" fill="#fff" /><rect x="15" y="79" width="6" height="6" fill="#0b1f3a" />
                    <rect x="38" y="8" width="6" height="6" /><rect x="50" y="8" width="6" height="6" /><rect x="38" y="20" width="6" height="6" /><rect x="56" y="14" width="6" height="6" />
                    <rect x="40" y="38" width="6" height="6" /><rect x="52" y="40" width="6" height="6" /><rect x="64" y="38" width="6" height="6" /><rect x="76" y="40" width="6" height="6" /><rect x="88" y="44" width="6" height="6" />
                    <rect x="8" y="40" width="6" height="6" /><rect x="20" y="44" width="6" height="6" /><rect x="8" y="52" width="6" height="6" /><rect x="20" y="56" width="6" height="6" />
                    <rect x="40" y="52" width="6" height="6" /><rect x="48" y="58" width="6" height="6" /><rect x="60" y="52" width="6" height="6" /><rect x="72" y="58" width="6" height="6" /><rect x="84" y="56" width="6" height="6" />
                    <rect x="40" y="70" width="6" height="6" /><rect x="52" y="72" width="6" height="6" /><rect x="64" y="70" width="6" height="6" /><rect x="76" y="74" width="6" height="6" /><rect x="88" y="72" width="6" height="6" />
                    <rect x="40" y="84" width="6" height="6" /><rect x="56" y="86" width="6" height="6" /><rect x="70" y="84" width="6" height="6" /><rect x="84" y="88" width="6" height="6" />
                  </g>
                </svg>
              </div>
              <p style={{ fontSize: '8.5pt', color: 'var(--muted)', marginTop: '6px' }}>Scan to verify authenticity.<br />Case ID: {CASE.caseId}</p>
            </div>
          </div>
          <p className="rp-sub">Evidence-Based References</p>
          <List items={['NCCN Clinical Practice Guidelines', 'ESMO Clinical Practice Guidelines', 'ASCO Guidelines', 'Standard Textbooks & Peer-Reviewed Literature']} />
        </RepPage>

        {/* 11 — INVESTIGATION SUMMARY */}
        <RepPage num="11" title="Investigation Summary">
          <table className="rp-table">
            <thead><tr><th>Investigation</th><th>Date</th><th>Findings</th><th>Interpretation</th></tr></thead>
            <tbody>{CASE.investigations.map((r, i) => <tr key={i}><td><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>)}</tbody>
          </table>
          <div className="rp-note">{I.info}<span>All investigations are within acceptable range for continuation of treatment.</span></div>
        </RepPage>

        {/* 12 — SIDE EFFECT MONITORING PLAN */}
        <RepPage num="12" title="Side Effect Monitoring Plan">
          <table className="rp-table">
            <thead><tr><th>Potential Side Effect</th><th>Monitoring</th><th>Management</th></tr></thead>
            <tbody>{CASE.sideEffects.map((r, i) => <tr key={i}><td><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody>
          </table>
          <div className="rp-note">{I.alert}<span>Report any severe or persistent side effects immediately.</span></div>
        </RepPage>

        {/* 13 — FOLLOW UP & SURVEILLANCE PLAN */}
        <RepPage num="13" title="Follow-up & Surveillance Plan">
          <div className="rp-cols3">
            <div>
              <p className="rp-sub">Schedule</p>
              <div className="rp-fields">
                <Field icon={I.cal} label="Follow up with Oncologist">Every 3 weeks (before each cycle)</Field>
                <Field icon={I.activity} label="CEA Monitoring">Every 3 months</Field>
                <Field icon={I.doc} label="CT Scan">Every 6 months or as advised</Field>
                <Field icon={I.diag} label="Colonoscopy">After completion of treatment</Field>
                <Field icon={I.heart} label="General Health Check">Every 3 months</Field>
              </div>
            </div>
            <div>
              <p className="rp-sub">Lifestyle Advice</p>
              <List items={['Eat a balanced diet rich in fruits & vegetables.', 'Stay hydrated.', 'Avoid smoking and alcohol.', 'Regular walking and light exercise.', 'Manage stress and get adequate sleep.']} />
            </div>
          </div>
        </RepPage>

        {/* 14 — SUPPORTIVE CARE PLAN */}
        <RepPage num="14" title="Supportive Care Plan">
          <div className="rp-cols3">
            <div>
              <div className="rp-fields">
                <Field icon={I.heart} label="Nutrition Support">High-protein diet, iron-rich foods, adequate hydration.</Field>
                <Field icon={I.chat} label="Psychological Support">Counseling and stress management as needed.</Field>
                <Field icon={I.activity} label="Physical Activity">Light exercise, yoga and breathing exercises recommended.</Field>
                <Field icon={I.shield} label="Infection Prevention">Hand hygiene, avoid crowded places, stay updated with vaccinations.</Field>
              </div>
            </div>
            <div>
              <p className="rp-sub">Supportive Medications</p>
              <div className="rp-fields">
                <Field icon={I.pill} label="Antiemetics">For nausea & vomiting</Field>
                <Field icon={I.pill} label="Probiotics">For gut health</Field>
                <Field icon={I.pill} label="Vitamins & Minerals">As per deficiency</Field>
                <Field icon={I.pill} label="Pain Management">As per requirement</Field>
              </div>
            </div>
          </div>
        </RepPage>

        {/* 15 — COST ESTIMATE SUMMARY */}
        <RepPage num="15" title="Cost Estimate Summary (Approx.)">
          <table className="rp-table">
            <thead><tr><th>Description</th><th>Estimated Cost (INR)</th></tr></thead>
            <tbody>
              {CASE.costs.map((c, i) => <tr key={i}><td>{c[0]}</td><td>₹ {c[1]}</td></tr>)}
              <tr><td><b>Total Estimated Cost (Per Cycle)</b></td><td><b>₹ 56,000 – 80,000</b></td></tr>
            </tbody>
          </table>
          <div className="rp-note">{I.info}<span>Costs may vary depending on hospital and location.</span></div>
        </RepPage>

        {/* 16 — ABOUT */}
        <RepPage num="16" title="About DBL International">
          <p style={{ fontSize: '10.5pt', color: '#33425e' }}>DBL International is a trusted name in Clinical Oncology Pharmacy &amp; Second Opinion Services.</p>
          <List items={['Expert Pharmacists & Oncologists', 'Evidence-Based Reviews', 'Personalized Patient Care', 'Global Standards, Local Support', 'Your Partner in Cancer Care']} />
          <div className="rp-note" style={{ marginTop: '20px' }}>
            <span style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>{I.globe} www.dblinternational.com</span>
              <span style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>{I.mail} care@dblinternational.com</span>
              <span style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>{I.phone} +91 XXXXX XXXXX</span>
            </span>
          </div>
          <div className="rp-banner" style={{ marginTop: '20px' }}>Expert Care. Every Step. Every Patient. Everywhere.</div>
        </RepPage>
      </div>
    </>
  );
}
