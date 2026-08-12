// AI report reader — uses Claude (document/vision) to read a patient's uploaded report and
// return a STRUCTURED, grounded summary that HELPS the human counselor triage and the doctor
// review. It is decision-support only: it never diagnoses, and a specialist makes all calls.
const storage = require('./storage');
const { CATEGORIES } = require('./categories');

// Haiku 4.5 by default (cheapest — ~1¢/report); set REPORT_AI_MODEL=claude-sonnet-5 for more capability.
const MODEL = process.env.REPORT_AI_MODEL || 'claude-haiku-4-5';
const configured = () => !!process.env.ANTHROPIC_API_KEY;

let _client = null;
function getClient() {
  if (!configured()) return null;
  if (!_client) {
    const AnthropicPkg = require('@anthropic-ai/sdk');
    const Anthropic = AnthropicPkg.default || AnthropicPkg;
    _client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  }
  return _client;
}

const SYSTEM = `You are a clinical intake assistant for a cancer second-opinion service. You read a patient's uploaded medical report and produce a STRUCTURED SUMMARY so a human counselor can route the case and a specialist oncologist can review it faster. You DO NOT diagnose or give medical advice — a qualified oncologist makes every clinical decision. Ground everything strictly in what the document says; never invent findings. If the file is unreadable or is not a medical report, say so plainly.`;

const promptText = () => `Read the attached medical report and respond with ONLY a JSON object (no prose, no code fences) of exactly this shape:
{
  "isMedicalReport": boolean,
  "reportType": string,          // e.g. "Histopathology", "PET-CT", "Blood panel", "Discharge summary", else "Unknown"
  "suggestedCategory": string,   // MUST be EXACTLY one of: ${JSON.stringify(CATEGORIES)}
  "confidence": "high" | "medium" | "low",
  "keyFindings": string[],       // 2-5 short bullets of the main findings, grounded in the text
  "summary": string,             // 2-3 plain-language sentences for the counselor
  "caveats": string              // anything unclear/illegible, or "" if none
}
Pick suggestedCategory only from that list (use "Other" if it doesn't fit). This is decision-support for humans, not a diagnosis.`;

async function analyzeReport(report) {
  const client = getClient();
  if (!client) { const e = new Error('AI analysis is not configured (set ANTHROPIC_API_KEY).'); e.code = 'NOT_CONFIGURED'; throw e; }

  const file = await storage.getBuffer(storage.keyFromUrl(report.fileUrl));
  if (!file) { const e = new Error('The report file could not be found in storage.'); e.code = 'NO_FILE'; throw e; }

  const data = file.buffer.toString('base64');
  let media;
  if (file.contentType === 'application/pdf') {
    media = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } };
  } else if (file.contentType === 'image/png' || file.contentType === 'image/jpeg') {
    media = { type: 'image', source: { type: 'base64', media_type: file.contentType, data } };
  } else {
    const e = new Error('Only PDF, JPG or PNG reports can be analysed.'); e.code = 'UNSUPPORTED'; throw e;
  }

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM,
    messages: [{ role: 'user', content: [media, { type: 'text', text: promptText() }] }],
  });

  const text = (msg.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('').trim();
  const json = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let out;
  try { out = JSON.parse(json); }
  catch { out = { isMedicalReport: false, reportType: 'Unknown', suggestedCategory: 'Other', confidence: 'low', keyFindings: [], summary: text.slice(0, 400), caveats: 'Could not parse the model output.' }; }
  if (!CATEGORIES.includes(out.suggestedCategory)) out.suggestedCategory = 'Other';
  if (!Array.isArray(out.keyFindings)) out.keyFindings = [];
  out.model = MODEL;
  return out;
}

module.exports = { analyzeReport, configured, MODEL };
