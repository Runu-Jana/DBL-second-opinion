#!/usr/bin/env node
/*
 * i18n-sync — keep the 7 locale files in sync from a single source of truth.
 *
 * English (client/src/i18n/locales/en.json) is authoritative. This script fills the
 * other six locales (hi, ar, bn, es, fr, ru) for any key that is either MISSING or
 * whose English source has CHANGED since the last sync, translating via the Anthropic API.
 * Existing translations for unchanged keys are left untouched.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/i18n-sync.js         # fill missing + changed
 *   node scripts/i18n-sync.js --all                                # re-translate everything
 *   node scripts/i18n-sync.js --lang=hi,fr                         # only these locales
 *
 * Config (env): I18N_MODEL (default claude-opus-5), I18N_EFFORT (default low).
 * The API key is read from ANTHROPIC_API_KEY (or an `ant auth login` profile) — never
 * hardcode it here.
 */
const fs = require('fs');
const path = require('path');
const AnthropicPkg = require('@anthropic-ai/sdk');
const Anthropic = AnthropicPkg.default || AnthropicPkg;

const LOCALES_DIR = path.join(__dirname, '..', 'client', 'src', 'i18n', 'locales');
const SNAPSHOT = path.join(__dirname, '..', 'client', 'src', 'i18n', '.i18n-snapshot.json');
const SOURCE = 'en';
const TARGETS = ['hi', 'ar', 'bn', 'es', 'fr', 'ru'];
const LANG_NAMES = { hi: 'Hindi', ar: 'Arabic (Modern Standard)', bn: 'Bengali', es: 'Spanish', fr: 'French', ru: 'Russian' };
const MODEL = process.env.I18N_MODEL || 'claude-opus-5';
const EFFORT = process.env.I18N_EFFORT || 'low';
const CHUNK = 40; // keys per API request — keeps each response bounded and reliable

const readJson = (p, fb) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb);
const writeJson = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n');

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}
function unflatten(flat) {
  const out = {};
  for (const [key, v] of Object.entries(flat)) {
    const parts = key.split('.');
    let node = out;
    for (let i = 0; i < parts.length - 1; i++) { node[parts[i]] = node[parts[i]] || {}; node = node[parts[i]]; }
    node[parts[parts.length - 1]] = v;
  }
  return out;
}
function parseJsonObject(text) {
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s < 0 || e < 0) throw new Error('model did not return a JSON object: ' + text.slice(0, 160));
  return JSON.parse(text.slice(s, e + 1));
}

let _client;
const getClient = () => (_client || (_client = new Anthropic())); // lazy: a no-op sync needs no API key

async function translateChunk(lang, payload) {
  const client = getClient();
  const system =
    `You are a professional software localizer for a clinical oncology second-opinion web app. ` +
    `Translate the UI strings from English into ${LANG_NAMES[lang]}.\n` +
    `Rules:\n` +
    `- Return ONLY a JSON object with the SAME keys as the input, each value translated. No prose, no markdown code fences.\n` +
    `- Preserve every placeholder, HTML entity, symbol and number exactly: ₹, ·, ©, —, %, quotes, line breaks, digits.\n` +
    `- Do NOT translate the brand name "DBL International".\n` +
    `- Keep a professional, warm, reassuring medical tone; match the source length where practical.\n` +
    `- These are health-related strings — translate precisely and do not invent claims.`;
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: EFFORT },
    system,
    messages: [{ role: 'user', content: 'Translate these strings:\n' + JSON.stringify(payload, null, 2) }],
  });
  if (msg.stop_reason === 'refusal') throw new Error('translation request was refused by the safety classifier');
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const result = parseJsonObject(text);
  // keep only the keys we asked for, coerced to strings
  const clean = {};
  for (const k of Object.keys(payload)) if (k in result) clean[k] = String(result[k]);
  const missing = Object.keys(payload).filter((k) => !(k in clean));
  if (missing.length) throw new Error(`model omitted ${missing.length} key(s), e.g. ${missing[0]}`);
  return clean;
}

(async () => {
  const args = process.argv.slice(2);
  const FORCE_ALL = args.includes('--all');
  const langArg = (args.find((a) => a.startsWith('--lang=')) || '').split('=')[1];
  const activeTargets = langArg ? langArg.split(',').map((s) => s.trim()).filter(Boolean) : TARGETS;

  const en = readJson(path.join(LOCALES_DIR, `${SOURCE}.json`), null);
  if (!en) throw new Error(`source locale ${SOURCE}.json not found in ${LOCALES_DIR}`);
  const enFlat = flatten(en);

  // Baseline: with no snapshot we seed from the current English so nothing already
  // translated gets redone — only genuinely missing keys are filled. --all forces a full redo.
  const hasSnapshot = fs.existsSync(SNAPSHOT);
  const snapFlat = FORCE_ALL ? {} : (hasSnapshot ? flatten(readJson(SNAPSHOT, {})) : enFlat);
  const changed = new Set(Object.keys(enFlat).filter((k) => enFlat[k] !== snapFlat[k]));

  console.log(`i18n-sync · model=${MODEL} effort=${EFFORT} · ${changed.size} changed English key(s)`);
  let total = 0;

  for (const lang of activeTargets) {
    if (!LANG_NAMES[lang]) { console.log(`? ${lang}: unknown locale, skipping`); continue; }
    const p = path.join(LOCALES_DIR, `${lang}.json`);
    const existingFlat = flatten(readJson(p, {}));
    const toDo = Object.keys(enFlat).filter((k) => changed.has(k) || !(k in existingFlat));
    if (!toDo.length) { console.log(`✓ ${lang}: up to date`); continue; }

    console.log(`→ ${lang} (${LANG_NAMES[lang]}): ${toDo.length} key(s)`);
    const merged = { ...existingFlat };
    for (let i = 0; i < toDo.length; i += CHUNK) {
      const chunkKeys = toDo.slice(i, i + CHUNK);
      const payload = {};
      chunkKeys.forEach((k) => { payload[k] = enFlat[k]; });
      const translated = await translateChunk(lang, payload);
      Object.assign(merged, translated);
      total += Object.keys(translated).length;
    }
    writeJson(p, unflatten(merged));
    console.log(`  wrote ${lang}.json`);
  }

  // Record the English we just synced against — but only on a full-target run, so a
  // --lang subset can't mark changed keys as "done" for the locales it skipped.
  if (!langArg) writeJson(SNAPSHOT, en);
  console.log(`\nDone — ${total} string(s) translated.`);
})().catch((e) => {
  console.error('\n✖ i18n-sync failed:', e.message);
  if (/api key|authentication|ANTHROPIC/i.test(e.message)) {
    console.error('  Set ANTHROPIC_API_KEY (or run `ant auth login`) and retry.');
  }
  process.exit(1);
});
