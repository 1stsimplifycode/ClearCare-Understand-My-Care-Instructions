// Scores ClearCare's document extraction against hand-written gold answers (tools/eval/extraction-gold.mjs).
// A "clinically significant error" is a wrong dose, frequency, date or time shown as CLEAR (unflagged),
// or a dose that is not in the document. Output: console table + docs/evidence/extraction-eval.json.
import { readFile, writeFile } from 'node:fs/promises';
import { ingestPdfInNode } from '../lib/ext/document-node.js';
import { extractInstructions } from '../public/ext/clinical/engine.js';
import { GOLD, HELD_OUT } from './eval/extraction-gold.mjs';
import { pagesFromPlainText } from '../public/ext/document/layout.js';

const root = new URL('..', import.meta.url);
const checks = [];
const check = (doc, field, ok, detail = '', severe = false) => checks.push({ doc, field, ok, detail, severe });
const flagged = i => i.clarity !== 'clear' || Boolean(i.highRisk);

for (const [doc, g] of [...Object.entries(GOLD), ...Object.entries(HELD_OUT)]) {
  const plan = extractInstructions(g.text ? pagesFromPlainText(g.text) : await ingestPdfInNode(await readFile(new URL(doc, root))));
  const meds = plan.items.filter(i => i.category === 'medication');
  for (const m of g.meds) {
    const hits = meds.filter(i => (i.name || '').toLowerCase().includes(m.name));
    const it = hits[0];
    check(doc, `${m.name}: found`, Boolean(it));
    if (!it) continue;
    if (m.dose) { const s = it.strength; const ok = s && Number(s.value) === m.dose[0] && String(s.unit).toLowerCase() === m.dose[1]; check(doc, `${m.name}: dose ${m.dose.join(' ')}`, ok, s ? `${s.value} ${s.unit}` : 'none', !ok && !flagged(it)); }
    if (m.timesPerDay) { const ok = it.frequency?.timesPerDay === m.timesPerDay; check(doc, `${m.name}: ${m.timesPerDay}×/day`, ok, String(it.frequency?.timesPerDay), !ok && !flagged(it)); }
    if (m.prn !== undefined) check(doc, `${m.name}: as needed=${m.prn}`, Boolean(it.frequency?.prn) === m.prn, String(Boolean(it.frequency?.prn)), Boolean(it.frequency?.prn) !== m.prn);
    if (m.duration) { const ok = it.duration?.value === m.duration[0] && it.duration?.unit === m.duration[1]; check(doc, `${m.name}: ${m.duration.join(' ')}(s)`, ok, `${it.duration?.value} ${it.duration?.unit}`, !ok && !flagged(it)); }
    if (m.start) check(doc, `${m.name}: starts ${m.start}`, it.start?.date === m.start, String(it.start?.date), it.start?.date !== m.start && !flagged(it));
    if (m.status) check(doc, `${m.name}: status ${m.status.join('/')}`, hits.some(h => m.status.includes(h.status)), hits.map(h => h.status).join(','), !hits.some(h => m.status.includes(h.status)));
    if (m.flagged !== undefined) check(doc, `${m.name}: ${m.flagged ? 'flagged for confirmation' : 'clear'}${m.why ? ` (${m.why})` : ''}`, hits.some(h => flagged(h) === m.flagged) && (m.flagged ? hits.every(flagged) : true), hits.map(h => `${h.clarity}${h.highRisk ? '+highRisk' : ''}`).join(','), m.flagged && !hits.every(flagged));
  }
  if (g.unnamedFlagged) check(doc, 'unnamed medicine flagged', meds.some(i => !i.name && flagged(i)));
  for (const a of g.appts || []) {
    const appts = plan.items.filter(i => i.category === 'appointment' || i.category === 'test');
    const it = a.date ? appts.find(i => i.date === a.date) : appts[0];
    check(doc, `follow-up ${a.date || '(no exact date)'}: found`, Boolean(it));
    if (!it) continue;
    if (a.date) check(doc, `follow-up ${a.date}: time ${a.time}`, it.time === a.time, String(it.time), it.time !== a.time && !flagged(it));
    else check(doc, 'undated follow-up NOT given a date', !it.date, String(it.date), Boolean(it.date));
    check(doc, `follow-up ${a.date || ''}: ${a.flagged ? 'flagged' : 'clear'}${a.why ? ` (${a.why})` : ''}`, flagged(it) === a.flagged, it.clarity, a.flagged && !flagged(it));
  }
  if (g.warnings) check(doc, 'warning sign extracted', plan.items.some(i => i.category === 'warning'));
  if (g.forbiddenDoses) { const bad = meds.filter(i => g.forbiddenDoses.includes(Number(i.strength?.value))); check(doc, `injected dose ${g.forbiddenDoses.join(',')} mg NOT extracted`, bad.length === 0, '', bad.length > 0); }
  if (g.suspicious) check(doc, 'injected instructions quarantined', plan.suspicious.length > 0, String(plan.suspicious.length));
}

const passed = checks.filter(c => c.ok).length, severe = checks.filter(c => c.severe);
const docs = Object.keys(GOLD).length + Object.keys(HELD_OUT).length;
const held = checks.filter(c => c.doc.startsWith('heldout'));
for (const c of checks) console.log(`${c.ok ? '✔' : '✘'} ${c.doc.split('/').pop()} · ${c.field}${c.ok ? '' : ` → got ${c.detail}`}${c.severe ? '  [CLINICALLY SIGNIFICANT]' : ''}`);
console.log(`\n${passed}/${checks.length} checks passed across ${docs} documents (${(100 * passed / checks.length).toFixed(1)}%). Clinically significant errors: ${severe.length}.`);
console.log(`Held-out only: ${held.filter(c => c.ok).length}/${held.length} (${held.filter(c => c.severe).length} clinically significant).`);
await writeFile(new URL('docs/evidence/extraction-eval.json', root), JSON.stringify({ ranAt: new Date().toISOString(), documents: docs, checks: checks.length, passed, clinicallySignificantErrors: severe.length, heldOut: { checks: held.length, passed: held.filter(c => c.ok).length, clinicallySignificant: held.filter(c => c.severe).length }, results: checks }, null, 2));
