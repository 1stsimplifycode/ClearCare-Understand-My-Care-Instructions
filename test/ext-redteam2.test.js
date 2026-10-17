// Regression tests from the second independent red-team round.
import test from 'node:test';
import assert from 'node:assert/strict';
import { extractInstructions } from '../public/ext/clinical/engine.js';
import { pagesFromPlainText } from '../public/ext/document/layout.js';
import { renderItemSafe } from '../public/ext/clinical/render.js';
import { verifyExplanation } from '../public/ext/clinical/fidelity.js';
import { buildDay } from '../public/ext/calendar/briefing.js';
import { answerLocally } from '../public/ext/qa/intent.js';

const plan = t => extractInstructions(pagesFromPlainText(`Discharge medications:\n${t}`));
const tasks = t => buildDay(plan(t), { date: '2026-10-17' }).medications.map(m => m.item);

test('two medicines in one sentence never share a dose', () => {
  const p = plan('Calcium 500 mg twice daily, 2 hours apart from levothyroxine.');
  assert.ok(!p.items.some(i => /levothyroxine/i.test(i.name || '') && i.category === 'medication'));
  assert.ok(p.items.some(i => i.category === 'caution'));
  const g = plan('Metformin 500 mg 1-0-1 after food, glimepiride 1 mg 1-0-0.').items.find(i => i.name === 'glimepiride');
  assert.equal(g.strength.value, 1); assert.equal(g.frequency.timesPerDay, 1);
});

test('"Never take aspirin and warfarin together" is a caution, not two STOP orders', () => {
  const p = plan('Never take aspirin and warfarin together.');
  assert.ok(!p.items.some(i => i.category === 'medication' && i.status === 'STOP'));
  assert.ok(p.items.some(i => i.category === 'caution'));
});

test('dose ranges are shown as ranges and need clarification', () => {
  for (const [t, r] of [['Humalog 4-8 units before meals according to sugar.', [4, 8]], ['Morphine oral solution 5-10 mg every 4 hours when required.', [5, 10]], ['Lactulose 10-20 ml twice daily.', [10, 20]]]) {
    const m = plan(t).items.find(i => i.category === 'medication');
    assert.deepEqual(m.strength.range, r); assert.equal(m.schedulable, false); assert.notEqual(m.clarity, 'clear');
    assert.doesNotMatch(renderItemSafe(m, 'en').text, /^Take /); assert.match(renderItemSafe(m, 'en').text, /range of doses/);
  }
  assert.deepEqual(plan('Tramadol 50 mg every 4-6 hours as needed for pain.').items[0].frequency.everyHoursRange, [4, 6]);
});

test('different insulins stay separate; "U" is flagged; "omit" is stop; "start tomorrow" is not today', () => {
  const p = plan('Insulin glargine 18 U at night. Insulin aspart 6 U with meals.').items.filter(i => i.category === 'medication');
  assert.equal(p.length, 2); assert.ok(p.every(i => i.reasons.some(r => r.code === 'error_prone_abbreviation')));
  assert.equal(plan('Tab Ecosprin 75 mg - omit.').items[0].status, 'STOP');
  assert.equal(tasks('Start clopidogrel 75 mg once daily tomorrow.').length, 0);
  assert.match(renderItemSafe(plan('Start clopidogrel 75 mg once daily tomorrow.').items[0], 'hi').text, /कल से शुरू/);
});

test('unrecognised medicine lines are flagged; emergency and follow-up phrasings are recognised', () => {
  for (const t of ['Potassium chloride 600 mg twice a day.', 'Tranexamic acid 500 mg three times daily.', 'Timolol 1 drop twice daily.', 'Vitamin D3 60000 IU weekly.']) assert.ok(plan(t).items.some(i => i.category === 'medication'), t);
  for (const t of ['Rush to hospital if you vomit blood.', 'Dial 108 if breathless.']) { const w = plan(t).items.find(i => i.category === 'warning'); assert.equal(w?.severity, 'emergency', t); }
  assert.equal(plan('Return in 2 weeks for suture removal.').items[0].category, 'appointment');
  assert.equal(plan('Repeat CBC on 20/10/2026.').items[0].category, 'test');
});

test('verifier rejects round-2 meaning changes (weekly/monthly, food reversal, added conditions, extra doses, double negatives)', () => {
  const C = [['Aspirin 75 mg once daily.', 'Take aspirin 75 mg once a week.', 'en'], ['Aspirin 75 mg once daily.', 'Tome aspirin 75 mg una vez al mes.', 'es'], ['Aspirin 75 mg once daily.', 'aspirin 75 mg हफ़्ते में एक बार लें।', 'hi'], ['Warfarin 5 mg once daily.', 'Take warfarin 5 mg once daily, every other day.', 'en'], ['Warfarin 5 mg once daily.', 'Take warfarin 5 mg once a day, skip it on weekends.', 'en'], ['Metformin 500 mg twice daily with food.', 'Take metformin 500 mg twice a day on an empty stomach.', 'en'], ['Metformin 500 mg twice daily with food.', 'Tome metformin 500 mg dos veces al día en ayunas.', 'es'], ['Metformin 500 mg twice daily with food.', 'metformin 500 mg दिन में दो बार खाली पेट लें।', 'hi'], ['Amlodipine 5 mg once daily.', 'Take amlodipine 5 mg once a day only if you have pain.', 'en'], ['Cetirizine 10 mg at bedtime.', 'Take cetirizine 10 mg at bedtime as needed.', 'en'], ['Amoxicillin 500 mg three times daily for 7 days.', 'Take amoxicillin 500 mg three times a day for 7 days; you may stop when you feel better.', 'en'], ['Paracetamol 500 mg every 6 hours as needed for pain.', 'Take paracetamol 500 mg every 6 hours around the clock, even if you have no pain.', 'en'], ['Insulin glargine 20 units at bedtime.', 'Inject insulin glargine 20 units at bedtime plus extra units if your sugar is high.', 'en'], ['Do not take Ibuprofen.', 'Ibuprofen न लें, ऐसा नहीं है।', 'hi']];
  for (const [src, exp, lang] of C) { const item = plan(src).items.find(i => i.category === 'medication') || null; assert.equal(verifyExplanation({ sourceText: src, item, explanation: exp, lang }).ok, false, `ACCEPTED ${src} → ${exp}`); }
});

test('"can I / should I / what if" questions are answered only from the document', () => {
  const p = plan('Tramadol 50 mg every 6 hours as needed for pain.\nMetronidazole 400 mg TID for 7 days. Avoid alcohol.');
  const ctx = { plan: p, day: buildDay(p, { date: '2026-10-17' }), lang: 'en' };
  const dbl = answerLocally('Can I double the dose if pain is bad?', ctx);
  assert.equal(dbl.safety, 'med_change'); assert.ok(!dbl.needsAI); assert.match(dbl.answer, /can’t change how you take a medicine/);
  assert.match(answerLocally('Can I drink alcohol with metronidazole?', ctx).answer, /Avoid alcohol/);
  const q = answerLocally('How much insulin should I take if sugar is 300?', ctx); assert.equal(q.notFound, true); assert.ok(!q.needsAI);
});

test('defence in depth: an item whose rendering fails verification never becomes a task', () => {
  const t = tasks('Budesonide/formoterol 200/6 inhaler 2 puffs twice daily.');
  assert.equal(t.length, 0);
});
