// Live AMD verification + English/Hindi/Kannada fidelity check. Uses the app's real code paths and the
// key in .env:  node --env-file=.env tools/amd-verify.mjs
// Writes sanitized evidence (no API key; synthetic documents only) to docs/evidence/.
import { readFile, writeFile } from 'node:fs/promises';
import { ingestPdfInNode } from '../lib/ext/document-node.js';
import { extractInstructions } from '../public/ext/clinical/engine.js';
import { renderItemSafe as renderItem } from '../public/ext/clinical/render.js';
import { verifyExplanation } from '../public/ext/clinical/fidelity.js';
import { explainV2 } from '../lib/ext/explain-v2.js';
import { translateV2, asciiDigits } from '../lib/ext/translate.js';
import { runCareAgent } from '../lib/ext/agent.js';
import { amdChat, amdConfig, telemetrySummary, amdQueueStatus } from '../lib/ext/amd-provider.js';

const root = new URL('..', import.meta.url);
const cfg = amdConfig();
if (!cfg.configured || cfg.mock) { console.error('Set RADEON_API_KEY in .env (and no CLEARCARE_AMD_BASE_URL) to run the live verification.'); process.exit(2); }
const lastCall = () => telemetrySummary().recent.at(-1);
const evidence = { ranAt: new Date().toISOString(), provider: cfg.provider, endpoint: cfg.baseUrl, model: cfg.model, requestSpacingMs: amdQueueStatus().intervalMs, steps: [] };
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const step = async (name, fn) => {
  if (only.length && !only.some(k => name.toLowerCase().includes(k))) return;
  const t0 = Date.now(); process.stdout.write(`… ${name}\n`);
  try { const r = await fn(); const call = lastCall(); evidence.steps.push({ name, ok: true, wallMs: Date.now() - t0, ...r, amdCall: call }); console.log(`✔ ${name}`, JSON.stringify(r).slice(0, 220)); }
  catch (e) { evidence.steps.push({ name, ok: false, wallMs: Date.now() - t0, error: e.code || e.message, amdCall: lastCall() }); console.log(`✘ ${name}: ${e.code || e.message}`); }
};
const load = async f => extractInstructions(await ingestPdfInNode(await readFile(new URL(f, root))));
const p01 = await load('discharge_pdf/01_everyday_recovery.pdf');
const p05 = await load('discharge_pdf/05_high_risk_apixaban.pdf');
const p07 = await load('discharge_pdf_adversarial/07_medication_changes.pdf');

// 1. Explanation of one instruction (core feature), verified before display.
await step('AMD explanation of one discharge instruction (explain-v2)', async () => {
  const item = p01.items.find(i => i.category === 'medication');
  const r = await explainV2({ instruction: item.provenance.text, language: 'en', mode: 'simple' });
  return { status: r.status, checks: r.checks, explanation: r.explanation, failures: r.failures };
});

// 2. Multilingual: the same facts in English (rules), Hindi (rules) and Kannada (AMD translation, verified).
const items = [...p01.items, ...p05.items, ...p07.items].filter(i => ['medication', 'appointment', 'warning'].includes(i.category) && i.provenance?.text).slice(0, 12);
const en = items.map(i => renderItem(i, 'en', 'simple').text);
let kn = null;
await step('AMD Kannada translation of 12 instructions (translate, one request)', async () => {
  const r = await translateV2({ language: 'kn', texts: en });
  kn = r.items;
  return { verified: r.items.filter(x => x.status === 'verified').length, total: r.items.length, failures: r.items.filter(x => x.status !== 'verified').map(x => x.failures) };
});
const nums = s => [...asciiDigits(s).matchAll(/\d+(?:\.\d+)?/g)].map(m => Number(m[0])).sort((a, b) => a - b).join(',');
const ml = items.map((it, i) => {
  const hi = renderItem(it, 'hi', 'simple').text;
  const k = kn?.[i];
  const name = (it.name || '').toLowerCase();
  const hiCheck = verifyExplanation({ sourceText: en[i], item: it, explanation: hi, lang: 'hi' });
  return {
    source: it.provenance.text, en: en[i], hi, kn: k?.text || null, knStatus: k?.status || 'not-run',
    facts: { numbersEn: nums(en[i]), numbersHi: nums(hi), numbersKn: k?.text ? nums(k.text) : null, medicine: name || null },
    sameNumbers: { hi: nums(hi) === nums(en[i]), kn: k?.text ? nums(k.text) === nums(en[i]) : null },
    medicineNameKept: { hi: !name || hi.toLowerCase().includes(name), kn: k?.text ? (!name || k.text.toLowerCase().includes(name)) : null },
    hiVerifier: hiCheck.ok ? 'pass' : hiCheck.failures.map(f => f.code).join(',')
  };
});

// 3. Care Agent: plan locally, one AMD reasoning call, verified answer.
await step('AMD Care Agent answer (plan → tools → one AMD call → verify)', async () => {
  const visits = [{ id: 'v1', who: 'Riya', title: 'Child specialist check-up', doctor: 'Dr. Mehta', date: '2026-10-18', time: '10:30', place: 'City Children Clinic' }];
  const r = await runCareAgent({ question: 'What medicines should I stop, and what do I have tomorrow?', language: 'en', today: '2026-10-17', items: p07.items, visits });
  return { status: r.status, confidence: r.confidence, tools: r.trace.map(t => t.tool), answer: r.answer, checks: r.checks?.map(c => `${c.ok ? 'pass' : 'FAIL'}: ${c.name}`) };
});

// 4. Failure handling against the real endpoint.
await step('AMD authentication failure is reported, not hidden', async () => {
  try { await amdChat({ system: 'Reply OK.', user: 'ping', env: { ...process.env, RADEON_API_KEY: 'invalid-key-for-test' }, op: 'auth-test', retries: 0 }); return { unexpected: 'request succeeded' }; }
  catch (e) { if (e.code !== 'provider_rejected' && e.status !== 502) throw e; return { handledAs: e.code, status: e.status }; }
});
await step('AMD timeout is reported as a timeout', async () => {
  try { await amdChat({ system: 'Reply OK.', user: 'ping', timeoutMs: 5, op: 'timeout-test', retries: 0 }); return { unexpected: 'request succeeded' }; }
  catch (e) { if (e.code !== 'timeout') throw e; return { handledAs: e.code, status: e.status }; }
});

evidence.telemetry = telemetrySummary();
const okMl = ml.filter(r => r.knStatus === 'verified');
evidence.multilingual = {
  items: ml.length,
  hindiSameNumbers: ml.filter(r => r.sameNumbers.hi).length, hindiNameKept: ml.filter(r => r.medicineNameKept.hi).length, hindiVerifierPass: ml.filter(r => r.hiVerifier === 'pass').length,
  kannadaVerified: okMl.length, kannadaSameNumbers: okMl.filter(r => r.sameNumbers.kn).length, kannadaNameKept: okMl.filter(r => r.medicineNameKept.kn).length,
  humanReview: 'NOT DONE: no qualified Hindi or Kannada reviewer was available. Outputs are saved for review in multilingual-eval.json.'
};
await writeFile(new URL('docs/evidence/amd-live-verification.json', root), JSON.stringify(evidence, null, 2));
await writeFile(new URL('docs/evidence/multilingual-eval.json', root), JSON.stringify({ ranAt: evidence.ranAt, summary: evidence.multilingual, rows: ml }, null, 2));
console.log('\nSummary:', JSON.stringify(evidence.multilingual), '\nTelemetry:', JSON.stringify({ calls: evidence.telemetry.calls, ok: evidence.telemetry.ok, p50Ms: evidence.telemetry.p50Ms, p95Ms: evidence.telemetry.p95Ms }));
