import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { extractInstructions, classifyStatus, parseFrequency } from '../public/ext/clinical/engine.js';
import { pagesFromPlainText } from '../public/ext/document/layout.js';
import { ingestPdfInNode } from '../lib/ext/document-node.js';
import { renderItem } from '../public/ext/clinical/render.js';
import { nodeSupportsPdfjs } from '../lib/ext/document-node.js';
import { verifyExplanation } from '../public/ext/clinical/fidelity.js';

const P = text => extractInstructions(pagesFromPlainText(text));
const med = (text, name) => P(text).items.find(i => i.category === 'medication' && (!name || i.name?.toLowerCase() === name));

test('"Start metoprolol after three days": three is a delay, never a 3 mg dose', () => {
  const m = med('Start metoprolol after three days.');
  assert.equal(m.status, 'START'); assert.equal(m.strength, null);
  assert.ok(m.reasons.some(r => r.code === 'missing_dose')); assert.equal(m.schedulable, false);
});

test('"Stop aspirin until reviewed by your doctor" is HOLD and can never become a reminder', () => {
  const m = med('Stop aspirin until reviewed by your doctor.');
  assert.equal(m.status, 'HOLD'); assert.equal(m.schedulable, false); assert.match(m.resumeCondition, /reviewed by your doctor/);
  for (const lang of ['en', 'es', 'hi']) { const r = renderItem(m, lang).text; assert.ok(verifyExplanation({ sourceText: m.text, item: m, explanation: r, lang }).ok, `${lang}: ${r}`); assert.doesNotMatch(r, /^(?:Take|Tome)\b/); }
});

test('taper "5 mg for three days, followed by 2.5 mg" keeps sequence and quantities', () => {
  const m = med('Take prednisone 5 mg for three days, followed by 2.5 mg.');
  assert.deepEqual(m.taper.map(s => [s.value, s.unit, s.duration?.value ?? null]), [[5, 'mg', 3], [2.5, 'mg', null]]);
  assert.ok(!m.reasons.some(r => r.code === 'conflicting_dose')); assert.equal(m.schedulable, false);
  assert.match(renderItem(m, 'en').text, /First take 5 mg for 3 days\. Then take 2\.5 mg\./);
});

test('"Continue oral medication BID PC for five days" → twice a day, after meals, 5 days, name and dose flagged', () => {
  const m = med('Continue oral medication BID PC for five days.');
  assert.equal(m.status, 'CONTINUE'); assert.equal(m.frequency.timesPerDay, 2); assert.ok(m.frequency.timing.includes('afterMeals'));
  assert.equal(m.duration.value, 5); assert.equal(m.route, 'oral');
  assert.deepEqual(m.reasons.map(r => r.code).sort(), ['missing_dose', 'missing_name']);
});

test('negation: "Do not stop taking" is CONTINUE; "Do not take ibuprofen" is STOP; "Do not take with food" is not STOP', () => {
  assert.equal(classifyStatus('Take apixaban 5 mg twice daily. Do not stop taking unless instructed by your provider.').status, 'CONTINUE');
  assert.equal(classifyStatus('Do not take ibuprofen.').status, 'STOP');
  assert.notEqual(classifyStatus('Take doxycycline 100 mg twice daily. Do not take with food.').status, 'STOP');
  assert.notEqual(classifyStatus('Take acetaminophen 500 mg. Do not exceed 3,000 mg in 24 hours.').status, 'STOP');
});

test('dates, times, phone numbers and limits are never read as doses', () => {
  const m = med('Take aspirin 81 mg daily starting October 20, 2026. Call (555) 010-2040 with questions.');
  assert.equal(m.strength.value, 81); assert.equal(m.start.date, '2026-10-20'); assert.equal(m.alternatives.length, 0);
  const a = med('Take acetaminophen 500 mg every 6 hours as needed for pain. Do not exceed 3,000 mg in 24 hours.');
  assert.equal(a.strength.value, 500); assert.equal(a.maxDaily.value, 3000); assert.equal(a.frequency.everyHours, 6); assert.equal(a.alternatives.length, 0);
});

test('missing unit, conflicting doses, unknown medicine, naked decimal, error-prone abbreviation all block reminders', () => {
  const cases = [['Take metoprolol 25 by mouth twice daily.', 'missing_unit'], ['Take warfarin 5 mg every evening. Take warfarin 2.5 mg every evening until next INR test.', 'conflicting_dose'], ['Take Zorvexil 20 mg once daily.', 'unrecognized_medicine'], ['Take metformin .5 g twice daily.', 'naked_decimal'], ['Take lisinopril 10 mg QD.', 'error_prone_abbreviation'], ['Take lisinopril 10 mg.', 'missing_frequency']];
  for (const [text, code] of cases) { const m = P(text).items.find(i => i.category === 'medication'); assert.ok(m.reasons.some(r => r.code === code), `${text} → ${code}`); assert.equal(m.schedulable, false, text); }
});

test('same medicine told to start AND stop is flagged, and stop/hold wins (no reminder)', () => {
  const m = med('Take aspirin 81 mg daily.\nStop aspirin until reviewed by your doctor.');
  assert.ok(['HOLD', 'STOP', 'CHANGE'].includes(m.status)); assert.ok(m.reasons.some(r => r.code === 'conflicting_status')); assert.equal(m.schedulable, false);
});

test('high-risk medicines are kept for care-team review and never scheduled', () => {
  for (const n of ['warfarin', 'apixaban', 'insulin', 'enoxaparin', 'oxycodone']) { const m = med(`Take ${n} 5 mg once daily.`); assert.equal(m.highRisk, true, n); assert.equal(m.schedulable, false, n); }
});

test('appointments: complete → schedulable; missing pieces, ambiguous dd/mm, relative and contradictory → clarification', () => {
  const ok = P('Follow up with Dr. Rao on October 22, 2026 at 10:30 AM at Northside Family Clinic.').items[0];
  assert.equal(ok.schedulable, true); assert.equal(ok.date, '2026-10-22'); assert.equal(ok.time, '10:30');
  assert.ok(P('Follow up on 05/06/2026 at 10 AM at City Hospital.').items[0].reasons.some(r => r.code === 'ambiguous_date'));
  assert.ok(P('Follow up in 7 days.').items[0].reasons.some(r => r.code === 'relative_date'));
  const two = P('Follow-up\nFollow up with Dr. Mehta on October 24, 2026 at 11:00 AM at Lakeside Clinic.\nFollow up with Dr. Mehta on October 27, 2026 at 11:00 AM at Lakeside Clinic.').items;
  assert.equal(two.length, 2); assert.ok(two.every(a => a.reasons.some(r => r.code === 'conflicting_appointment') && !a.schedulable));
});

test('warning severity is deterministic and emergency wording is preserved in every language', () => {
  const w = P('Call 108 or go to the nearest emergency department if you have chest pain.').items[0];
  assert.equal(w.severity, 'emergency');
  for (const lang of ['en', 'es', 'hi']) assert.ok(verifyExplanation({ sourceText: w.text, explanation: renderItem(w, lang).text, lang }).ok, lang);
  assert.equal(P('Call the clinic for any bleeding.').items[0].severity, 'urgent');
});

test('prompt-injection lines are quarantined and never become instructions', { skip: !nodeSupportsPdfjs() && 'needs Node >= 22.13 for pdf.js' }, async () => {
  const p = extractInstructions(await ingestPdfInNode(await readFile(new URL('../discharge_pdf_adversarial/14_prompt_injection.pdf', import.meta.url))));
  assert.equal(p.suspicious.length, 2);
  const w = p.items.find(i => i.name === 'warfarin');
  assert.equal(w.strength.value, 5); assert.equal(w.alternatives.length, 0, 'the injected "10 mg" must not appear');
});

test('frequency parser covers abbreviations and plain language', () => {
  assert.equal(parseFrequency('t.i.d.').timesPerDay, 3); assert.equal(parseFrequency('q8h').everyHours, 8); assert.equal(parseFrequency('every 12 hours').timesPerDay, 2);
  assert.equal(parseFrequency('PRN for pain').prn, true); assert.equal(parseFrequency('once a week').perWeek, 1);
});

test('original fixtures keep their original safety outcomes under the new engine', async () => {
  const p = async n => extractInstructions(await ingestPdfInNode(await readFile(new URL(`../discharge_pdf/${n}`, import.meta.url))));
  assert.ok((await p('02_ambiguous_dose.pdf')).items.find(i => i.name === 'Metoprolol').reasons.some(r => r.code === 'missing_unit'));
  const w = (await p('03_conflicting_warfarin.pdf')).items.find(i => i.name === 'Warfarin'); assert.ok(w.reasons.some(r => r.code === 'conflicting_dose')); assert.ok(w.highRisk);
  const u = await p('04_missing_units_insulin.pdf'); assert.ok(u.items.filter(i => i.category === 'medication').every(m => !m.schedulable));
  const a = await p('05_high_risk_apixaban.pdf'); assert.ok(a.items.find(i => i.name === 'Apixaban').highRisk); assert.ok(!a.items.find(i => i.category === 'appointment').schedulable);
  const s = await p('06_unreadable_scan.pdf'); assert.ok(s.items.every(i => !i.schedulable)); assert.ok(s.items.some(i => i.clarity === 'unreadable'));
});

test('PROPERTY: every deterministic rendering of every fixture item passes independent fidelity checks (3 languages × 3 modes)', async () => {
  const dirs = ['../discharge_pdf/', '../discharge_pdf_adversarial/'];
  let checked = 0;
  for (const d of dirs) for (const n of (await readdir(new URL(d, import.meta.url))).filter(f => f.endsWith('.pdf'))) {
    let doc; try { doc = await ingestPdfInNode(await readFile(new URL(d + n, import.meta.url))); } catch { continue; }
    for (const it of extractInstructions(doc).items) for (const lang of ['en', 'es', 'hi']) for (const mode of ['simple', 'detailed', 'steps']) {
      const r = renderItem(it, lang, mode);
      if (r.blocked || r.untranslated || it.category === 'note' || it.category === 'mention' || it.category === 'allergy' || it.clarity !== 'clear') continue;
      const text = [r.text, ...(r.steps || [])].join('\n');
      const v = verifyExplanation({ sourceText: it.provenance.text, item: it, explanation: text, lang, repeats: mode === 'steps' });
      assert.ok(v.ok, `${n} [${lang}/${mode}] ${text} → ${JSON.stringify(v.failures)}`);
      checked++;
    }
  }
  assert.ok(checked > 100, `checked ${checked}`);
});
