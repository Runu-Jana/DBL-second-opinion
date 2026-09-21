// AI drafting for the specialist's second opinion.
//
// Deliberately narrow: this drafts from material a human has already produced — the counsellor's
// assessment, the AI readings of the uploaded documents, and the questions the patient typed when
// they uploaded — and never from the raw files. The doctor edits what comes back and signs it off;
// nothing here is delivered to a patient unread.
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = process.env.REPORT_AI_MODEL || 'claude-haiku-4-5';
const configured = () => !!process.env.ANTHROPIC_API_KEY;

function getClient() {
  if (!configured()) { const e = new Error('AI is not configured.'); e.code = 'NO_AI'; throw e; }
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    // Identity-linked keys are rejected without this header.
    ...(process.env.ANTHROPIC_WORKSPACE_ID
      ? { defaultHeaders: { 'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID } }
      : {}),
  });
}

const SYSTEM = `You are assisting a qualified oncologist who is writing a second-opinion report for a cancer patient. You produce a STRUCTURED DRAFT for that doctor to edit and sign off. You are not the clinician and you do not make the decision — the doctor does.

Rules:
- Ground every statement in the material provided. Never invent a finding, a measurement, a stage or a test result.
- Where the material is silent or unclear, say so explicitly rather than filling the gap.
- Write for the patient to read: plain language, calm, no false reassurance and no alarm.
- Do not state a prognosis or survival figure.
- Mark anything the doctor must confirm with [CONFIRM].`;

// The prompt is the contract with the model, so it is exported for the tests, which can check it
// without an API key. When the patient asked questions, the draft gets an extra section that
// answers them one by one — the whole service exists to answer that person's question, and a
// report that never addresses it has missed the point however thorough it is otherwise.
const prompt = ({ patientName, cancerType, counsellorReport, readings = [], patientQuestions }) => {
  const asked = String(patientQuestions || '').trim();
  return `Draft a second-opinion report for ${patientName || 'this patient'}${cancerType ? ` (working category: ${cancerType})` : ''}.

COUNSELLOR'S ASSESSMENT
${counsellorReport || '(none recorded)'}

AI READINGS OF THE UPLOADED DOCUMENTS
${readings.length ? readings.map((r, i) => `[${i + 1}] ${r.type || 'Document'} (${r.date || 'undated'})\n${r.aiSummary}`).join('\n\n') : '(no documents have been read)'}

THE PATIENT'S OWN QUESTIONS (typed when they uploaded)
${asked || '(none asked)'}

Use exactly these headings, as plain text with no markdown:

SUMMARY OF THE CASE
WHAT THE REPORTS SHOW
MY ASSESSMENT
RECOMMENDED NEXT STEPS
${asked ? 'ANSWERS TO YOUR QUESTIONS\n' : ''}QUESTIONS TO DISCUSS WITH YOUR TREATING TEAM
${asked ? `
Under ANSWERS TO YOUR QUESTIONS take each of the patient's questions in turn: restate it in a few words, then answer it from the material above. Where the material cannot answer one, say so plainly and name who can — their treating team, or a specific test — rather than guessing.
` : ''}
Keep it under ${asked ? 650 : 500} words.`;
};

// Returns draft text. Throws with .code NO_AI when the key is missing.
async function draftOpinion({ patientName, cancerType, counsellorReport, readings = [], patientQuestions }) {
  const client = getClient();
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1600,
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt({ patientName, cancerType, counsellorReport, readings, patientQuestions }) }],
  });
  return (msg.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
}

module.exports = { draftOpinion, buildPrompt: prompt, configured, MODEL };
