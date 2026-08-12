// Public AI assistant chat (Claude-powered). Answers questions about DBL's services and process.
// It never diagnoses — clinical questions are routed to "upload your reports / contact the team".
// Gated by ANTHROPIC_API_KEY; returns a graceful fallback when the key isn't set.
const express = require('express');
const router = express.Router();

const MODEL = process.env.CHAT_AI_MODEL || 'claude-haiku-4-5';
const configured = () => !!process.env.ANTHROPIC_API_KEY;

let _client = null;
function getClient() {
  if (!configured()) return null;
  if (!_client) {
    const Pkg = require('@anthropic-ai/sdk');
    const Anthropic = Pkg.default || Pkg;
    _client = new Anthropic();
  }
  return _client;
}

const SYSTEM = `You are the friendly virtual assistant for DBL International — an online cancer second-opinion and clinical-oncology-pharmacy service. Help visitors understand what we offer and how to get started.

We provide: expert cancer second opinions, treatment plan review, chemotherapy review, clinical oncology pharmacy / medication review, multidisciplinary tumour board review, video consultations, and patient assistance / care coordination. Patients upload their medical reports (PDF/scans) and our specialists review them; a written opinion is usually ready within 24–48 hours.

Rules:
- Be warm, calm, and concise — many visitors are anxious cancer patients or their families.
- You DO NOT diagnose, interpret specific scans/reports, or give personal medical or treatment advice. If asked, gently say a qualified oncologist will review their case, and invite them to upload their reports or contact the care team.
- Keep replies short (2–4 sentences), plain language, no jargon.
- If you don't know a specific detail (exact price, a specific doctor's availability, appointment slots), suggest they contact the care team or upload their report.
- Never invent medical facts, statistics, or outcomes.`;

// POST /api/chat  { messages: [{ role: 'user'|'assistant', content }] } -> { reply }
router.post('/', async (req, res) => {
  try {
    const client = getClient();
    if (!client) {
      return res.json({ configured: false, reply: "Our live chat isn't switched on yet. Please use the contact form or upload your reports, and our care team will reach out to you." });
    }
    const raw = Array.isArray(req.body && req.body.messages) ? req.body.messages : [];
    const messages = raw.slice(-12)
      .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 2000) }))
      .filter((m) => m.content.trim());
    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'No message provided.' });
    }
    const msg = await client.messages.create({ model: MODEL, max_tokens: 400, system: SYSTEM, messages });
    const reply = (msg.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('').trim();
    res.json({ reply: reply || 'Sorry, I could not respond just now. Please try again or contact our care team.' });
  } catch (e) {
    console.error('chat error:', e.message);
    res.status(500).json({ error: 'Chat is temporarily unavailable. Please try again in a moment.' });
  }
});

module.exports = router;
