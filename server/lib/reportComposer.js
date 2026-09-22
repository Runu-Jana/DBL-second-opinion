// AI composition of the FULL second-opinion report.
//
// The specialist does the clinical thinking as a short tick-box intake (agree with the diagnosis?
// is the plan appropriate? which recommendations apply?). This turns that intake — together with
// the counsellor's assessment, the AI readings of the uploaded documents, and the questions the
// patient typed — into the complete structured report the Report.jsx layout renders.
//
// It is decision-support with human sign-off: the doctor reviews and edits every field, an admin
// approves, and only then does the patient see it. The model never invents a finding, a dose, a
// measurement or a cost it was not given, and it flags anything the doctor must confirm.
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = process.env.REPORT_AI_MODEL || 'claude-haiku-4-5';
const configured = () => !!process.env.ANTHROPIC_API_KEY;

function getClient() {
  if (!configured()) { const e = new Error('AI is not configured.'); e.code = 'NO_AI'; throw e; }
  const AnthropicPkg = Anthropic.default || Anthropic;
  return new AnthropicPkg(
    process.env.ANTHROPIC_WORKSPACE_ID
      ? { defaultHeaders: { 'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID } }
      : {},
  );
}

const SYSTEM = `You are assisting a qualified oncologist who is writing a second-opinion report for a cancer patient. You expand the doctor's short clinical intake into a COMPLETE structured report that the doctor then reviews, edits and signs off. You are not the clinician and you do not make the decision — the doctor does.

Rules:
- Ground every statement, table row, dose and figure strictly in the material you are given: the doctor's intake, the counsellor's assessment, the AI readings of the documents, and the patient's questions. NEVER invent a finding, a measurement, a stage, a test result, a drug dose or a cost.
- Where you were not given something a field needs, put an empty string or empty list — do not guess. It is correct and expected for tables to be empty when the material does not contain that data.
- Any value you had to infer rather than read directly must end with " [CONFIRM]" so the doctor checks it.
- Write for the patient to read: plain language, calm, factual, no false reassurance and no alarm.
- Never state a prognosis, a survival figure or a percentage chance.
- Respect the doctor's intake as their clinical direction: if they ticked that the plan is appropriate, do not contradict it; if they asked to consider alternatives, reflect that.`;

// The exact JSON the report renders from. Kept here as the single contract shared by the model,
// the renderer and the tests. Empty strings / empty arrays are valid and render as an omitted or
// "not provided" section — a report only shows what the material actually supports.
const SHAPE = `{
  "header": {
    "diagnosis": string,          // the confirmed diagnosis in words, e.g. "Adenocarcinoma Colon"
    "cancerType": string,         // broad type, e.g. "Carcinoma Colon"
    "stage": string,              // e.g. "Stage III (T3N1M0)" — "" if not documented
    "chiefComplaint": string,     // why the patient sought this opinion, in a phrase
    "prevTreatment": string,      // treatment already given, or ""
    "currentTreatment": string,   // treatment currently ongoing/planned, or ""
    "service": string             // leave as "Medical Second Opinion & Clinical Oncology Review"
  },
  "reportsReviewed": string[],    // the documents you were shown, each as "Type — date"
  "pharmacy": {                   // clinical oncology pharmacy review — "" for any field you cannot ground
    "medicationReview": string, "chemoAssessment": string, "doseReview": string,
    "interactionAnalysis": string, "sideEffectManagement": string, "supportiveCare": string,
    "safety": string, "counseling": string
  },
  "secondOpinion": {              // the medical second opinion — the core of the report
    "diagnosisReview": string, "investigationsReview": string, "treatmentReview": string,
    "alternatives": string, "additionalTests": string, "overallOpinion": string
  },
  "medications": [ { "name": string, "dose": string, "purpose": string, "status": string } ],
  "interactions": {
    "major": boolean,             // true only if a major interaction is documented
    "minor": [ { "combo": string, "risk": string, "recommendation": string } ],
    "considerations": string[]
  },
  "recommendations": string[],    // the treatment recommendations, one clear sentence each
  "nextSteps": string[],          // next steps & care coordination, one step each
  "investigations": [ { "name": string, "date": string, "findings": string, "interpretation": string } ],
  "sideEffects": [ { "effect": string, "monitoring": string, "management": string } ],
  "followUp": {
    "schedule": [ { "item": string, "when": string } ],
    "lifestyle": string[]
  },
  "supportive": {
    "nutrition": string, "psychological": string, "physical": string, "infection": string,
    "medications": [ { "type": string, "purpose": string } ]
  },
  "costs": [ { "description": string, "range": string } ],  // INR ranges ONLY if the doctor supplied them, else []
  "costTotal": string,            // "" unless costs were supplied
  "answers": [ { "question": string, "answer": string } ]   // one per patient question, [] if none asked
}`;

// A compact rendering of the doctor's tick-box intake as clinical direction for the model.
function intakeText(form = {}) {
  const f = form || {};
  const yes = (b) => (b ? 'yes' : 'no');
  const list = (a) => (Array.isArray(a) && a.length ? a.join(', ') : '(none)');
  return `Stage (as the doctor recorded it): ${f.stage || '(not recorded)'}
Agrees with the stated diagnosis: ${yes(f.diagnosisAgree)}
Histopathology confirms the cancer type: ${yes(f.histologyConfirms)}
Staging is adequately documented: ${yes(f.stagingDocumented)}
Further tests are needed: ${yes(f.needsMoreTests)}${f.needsMoreTests ? ` — ${list(f.moreTests)}` : ''}
Current treatment: ${list(f.currentTreatment)}
The current plan is appropriate (per NCCN/ESMO/ASCO): ${yes(f.planAppropriate)}
The doctor recommends modifying the plan: ${yes(f.recommendModification)}
Alternatives should be considered: ${yes(f.considerAlternatives)}
Recommendations the doctor selected: ${list(f.recommendations)}
Follow-up interval with the oncologist: ${f.followUpEvery || '(not set)'}
Follow-up / monitoring selected: ${list(f.followUp)}
Overall tone the doctor intends: ${f.tone || '(not set)'}
The doctor's own note: ${f.note ? f.note : '(none)'}`;
}

// The prompt is the contract with the model, exported so the tests can check it without a key.
const prompt = ({ patientName, cancerType, counsellorReport, readings = [], patientQuestions, form }) => {
  const asked = String(patientQuestions || '').trim();
  return `Compose the full second-opinion report for ${patientName || 'this patient'}${cancerType ? ` (working category: ${cancerType})` : ''}.

THE DOCTOR'S CLINICAL INTAKE (their decisions — treat as direction)
${intakeText(form)}

COUNSELLOR'S ASSESSMENT
${counsellorReport || '(none recorded)'}

AI READINGS OF THE UPLOADED DOCUMENTS (the only source for findings, doses and dates)
${readings.length ? readings.map((r, i) => `[${i + 1}] ${r.type || 'Document'} (${r.date || 'undated'})\n${r.aiSummary}`).join('\n\n') : '(no documents have been read)'}

THE PATIENT'S OWN QUESTIONS (typed when they uploaded)
${asked || '(none asked)'}

Respond with ONLY a JSON object (no prose, no code fences) of exactly this shape:
${SHAPE}

Fill "answers" with one entry per patient question above, answering each from the material; where the material cannot answer one, say so plainly and name who can. Populate the medications, investigations and side-effect tables ONLY from what the readings actually contain — leave a table empty rather than inventing rows. Leave costs empty unless the doctor supplied figures. Keep every narrative field to a few sentences.`;
};

// Coerce whatever the model returns into the exact shape, so the renderer never has to guard.
const S = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const A = (v) => (Array.isArray(v) ? v : []);
function normalise(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const h = r.header || {};
  const so = r.secondOpinion || {};
  const ph = r.pharmacy || {};
  const inter = r.interactions || {};
  const fu = r.followUp || {};
  const sup = r.supportive || {};
  return {
    header: {
      diagnosis: S(h.diagnosis), cancerType: S(h.cancerType), stage: S(h.stage),
      chiefComplaint: S(h.chiefComplaint), prevTreatment: S(h.prevTreatment),
      currentTreatment: S(h.currentTreatment),
      service: S(h.service) || 'Medical Second Opinion & Clinical Oncology Review',
    },
    reportsReviewed: A(r.reportsReviewed).map(S),
    pharmacy: {
      medicationReview: S(ph.medicationReview), chemoAssessment: S(ph.chemoAssessment),
      doseReview: S(ph.doseReview), interactionAnalysis: S(ph.interactionAnalysis),
      sideEffectManagement: S(ph.sideEffectManagement), supportiveCare: S(ph.supportiveCare),
      safety: S(ph.safety), counseling: S(ph.counseling),
    },
    secondOpinion: {
      diagnosisReview: S(so.diagnosisReview), investigationsReview: S(so.investigationsReview),
      treatmentReview: S(so.treatmentReview), alternatives: S(so.alternatives),
      additionalTests: S(so.additionalTests), overallOpinion: S(so.overallOpinion),
    },
    medications: A(r.medications).map((m) => ({ name: S(m.name), dose: S(m.dose), purpose: S(m.purpose), status: S(m.status) || 'Appropriate' })),
    interactions: {
      major: !!inter.major,
      minor: A(inter.minor).map((m) => ({ combo: S(m.combo), risk: S(m.risk), recommendation: S(m.recommendation) })),
      considerations: A(inter.considerations).map(S),
    },
    recommendations: A(r.recommendations).map(S),
    nextSteps: A(r.nextSteps).map(S),
    investigations: A(r.investigations).map((x) => ({ name: S(x.name), date: S(x.date), findings: S(x.findings), interpretation: S(x.interpretation) })),
    sideEffects: A(r.sideEffects).map((x) => ({ effect: S(x.effect), monitoring: S(x.monitoring), management: S(x.management) })),
    followUp: {
      schedule: A(fu.schedule).map((x) => ({ item: S(x.item), when: S(x.when) })),
      lifestyle: A(fu.lifestyle).map(S),
    },
    supportive: {
      nutrition: S(sup.nutrition), psychological: S(sup.psychological),
      physical: S(sup.physical), infection: S(sup.infection),
      medications: A(sup.medications).map((x) => ({ type: S(x.type), purpose: S(x.purpose) })),
    },
    costs: A(r.costs).map((c) => ({ description: S(c.description), range: S(c.range) })),
    costTotal: S(r.costTotal),
    answers: A(r.answers).map((x) => ({ question: S(x.question), answer: S(x.answer) })),
  };
}

// A plain-text flattening of the structured report, kept in doctorOpinion for email, search,
// the admin activity summary and any surface that has not yet learned to render the structure.
function toPlainText(data, patientName) {
  const d = normalise(data);
  const out = [];
  const push = (h, body) => { if (body && String(body).trim()) { out.push(h.toUpperCase()); out.push(String(body).trim()); out.push(''); } };
  const so = d.secondOpinion;
  push('Medical second opinion for ' + (patientName || 'the patient'), '');
  push('Diagnosis', [d.header.diagnosis, d.header.stage].filter(Boolean).join(' · '));
  push('Review of diagnosis', so.diagnosisReview);
  push('Review of investigations', so.investigationsReview);
  push('Review of treatment plan', so.treatmentReview);
  push('Alternative options', so.alternatives);
  push('Additional tests', so.additionalTests);
  push('Overall clinical opinion', so.overallOpinion);
  if (d.recommendations.length) push('Treatment recommendations', d.recommendations.map((x) => '• ' + x).join('\n'));
  if (d.answers.length) push('Answers to your questions', d.answers.map((a) => `${a.question}\n${a.answer}`).join('\n\n'));
  return out.join('\n').trim();
}

// Returns the normalised report object. Throws with .code NO_AI when the key is missing.
async function composeReport({ patientName, cancerType, counsellorReport, readings = [], patientQuestions, form }) {
  const client = getClient();
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 6000,   // the full structured report is large; headroom so the JSON is never truncated
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt({ patientName, cancerType, counsellorReport, readings, patientQuestions, form }) }],
  });
  const text = (msg.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('').trim();
  const json = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let raw;
  try { raw = JSON.parse(json); }
  catch { const e = new Error('The AI returned a report that could not be read. Try again.'); e.code = 'BAD_JSON'; throw e; }
  return normalise(raw);
}

module.exports = { composeReport, normalise, toPlainText, buildPrompt: prompt, intakeText, configured, MODEL, SHAPE };
