import test from 'node:test';
import assert from 'node:assert/strict';
import { extractInstructions } from '../public/ext/clinical/engine.js';
import { pagesFromPlainText } from '../public/ext/document/layout.js';
import { verifyExplanation } from '../public/ext/clinical/fidelity.js';
import { renderItem } from '../public/ext/clinical/render.js';
import { toSpeech, verifySpeech, speakable } from '../public/ext/speech/normalize.js';
import { classify, answerLocally, detectLanguage } from '../public/ext/qa/intent.js';
import { buildDay } from '../public/ext/calendar/briefing.js';

const item = t => extractInstructions(pagesFromPlainText(t)).items[0];
const V = (src, out, lang = 'en') => verifyExplanation({ sourceText: src, item: item(src), explanation: out, lang });
const codes = r => r.failures.map(f => f.code);

test('verifier BLOCKS meaning changes (adversarial AI outputs)', () => {
  const src = 'Take amoxicillin 500 mg by mouth three times daily for 7 days.';
  assert.ok(codes(V(src, 'Take amoxicillin 50 mg by mouth three times a day for 7 days.')).includes('number_added'), 'wrong dose');
  assert.ok(codes(V(src, 'Take amoxicillin by mouth three times a day for 7 days.')).includes('number_missing'), 'missing dose');
  assert.ok(codes(V(src, 'Take amoxicillin 500 mcg by mouth three times a day for 7 days.')).some(c => c === 'unit_added' || c === 'unit_missing'), 'unit changed');
  assert.ok(codes(V(src, 'Take amoxicillin 500 mg by mouth twice a day for 7 days.')).includes('frequency_changed'), 'frequency changed');
  assert.ok(codes(V(src, 'Take amoxicillin 500 mg three times a day for 7 days and ibuprofen for pain.')).includes('name_added'), 'medicine added');
  assert.ok(codes(V(src, 'Take amoxicillin 500 mg three times a day for 10 days.')).includes('number_added'), 'duration changed');
  assert.ok(codes(V('Stop aspirin until reviewed by your doctor.', 'Take aspirin until your doctor reviews it.')).includes('negation_lost'), 'stop became take');
  assert.ok(codes(V('Do not take ibuprofen.', 'Tome ibuprofeno.', 'es')).includes('negation_lost'), 'es negation lost');
  assert.ok(codes(V('Do not take ibuprofen.', 'ibuprofen लें।', 'hi')).includes('negation_lost'), 'hi negation lost');
  assert.ok(codes(V('Call 108 or go to the nearest emergency department if you have chest pain.', 'If you have chest pain, call the clinic when you can.')).includes('severity_downgraded'));
  assert.ok(codes(V('Call the clinic for any bleeding.', 'A little bleeding is normal, nothing to worry about. Call the clinic for any bleeding.')).includes('false_reassurance'));
  assert.ok(codes(V(src, 'Take amoxicillin 500 mg three times a day for 7 days.', 'hi')).includes('wrong_language'));
  assert.ok(codes(V(src, '<b>Take</b> amoxicillin 500 mg three times a day for 7 days https://x.y')).includes('unsafe_content'));
  assert.ok(codes(V('Take metformin 0.5 g twice daily.', 'Take metformin 5 g twice a day.')).length > 0, '0.5 vs 5');
});

test('verifier ACCEPTS faithful explanations in English, Spanish and Hindi', () => {
  const src = 'Take amoxicillin 500 mg by mouth three times daily for 7 days.';
  assert.ok(V(src, 'Take amoxicillin 500 mg by mouth, three times a day, for 7 days.').ok);
  assert.ok(V(src, 'Tome amoxicillin 500 mg por la boca, tres veces al día durante 7 días.', 'es').ok);
  assert.ok(V(src, 'amoxicillin 500 mg मुँह से, दिन में तीन बार, 7 दिन तक लें।', 'hi').ok);
  assert.ok(V('Continue oral medication BID PC for five days.', 'Keep taking the medicine by mouth twice a day after meals for five days.').ok);
});

test('multilingual rendering keeps clinical meaning: BID PC example and negations', () => {
  const m = item('Continue oral medication BID PC for five days.');
  // Name and dose are missing → shown as needing clarification in every language, never invented.
  for (const lang of ['en', 'es', 'hi']) assert.equal(renderItem(m, lang).blocked, true);
  const a = item('Take apixaban 5 mg twice daily. Do not stop taking unless instructed by your provider.');
  assert.match(renderItem(a, 'es').text, /No deje de tomarlo/); assert.match(renderItem(a, 'hi').text, /बंद न करें/);
  assert.match(renderItem(item('Do not take ibuprofen.'), 'hi').text, /लेना बंद करें/);
});

test('speech: 0.5 mg and 5 mg are spoken differently; negation and numbers survive in all languages', () => {
  assert.equal(toSpeech('Take 0.5 mg', 'en'), 'Take zero point 5 milligrams');
  assert.equal(toSpeech('Take 5 mg', 'en'), 'Take 5 milligrams');
  assert.notEqual(toSpeech('0.5 mg', 'es'), toSpeech('5 mg', 'es'));
  assert.match(toSpeech('2.5 mg', 'hi'), /2 दशमलव 5 मिलीग्राम/);
  assert.match(toSpeech('Do not exceed 3,000 mg', 'en'), /Do not exceed 3000 milligrams/);
  for (const [text, lang] of [['Take 0.25 mg twice daily. Do not take more than 1,000 mg.', 'en'], ['No tome más de 2.5 mg.', 'es'], ['24 घंटे में 3000 mg से ज़्यादा न लें।', 'hi']]) assert.ok(verifySpeech(text, toSpeech(text, lang), lang).ok, text);
  assert.equal(verifySpeech('Take 0.5 mg.', 'Take 5 milligrams.', 'en').ok, false, 'tampered speech must fail');
  assert.equal(verifySpeech('Do not take aspirin.', 'Take aspirin.', 'en').ok, false, 'dropped negation must fail');
  assert.equal(speakable('Take BID', 'en').spoken, 'Take twice a day');
});

test('language detection and code-mixed intents (Hinglish, Devanagari, Spanish)', () => {
  assert.equal(detectLanguage('Ye medicine kab leni hai?').lang, 'hi');
  assert.equal(detectLanguage('दवा कब लेनी है?').script, 'devanagari');
  assert.equal(detectLanguage('¿Cuándo es mi cita?').lang, 'es');
  const cases = [['Doctor ne discharge mein kya bola?', 'original'], ['Ye medicine kab leni hai?', 'medicine_when'], ['Follow-up appointment kab hai?', 'appointment'], ['¿Cuándo es mi cita?', 'appointment'], ['दवा कब लेनी है?', 'medicine_when'], ["I didn't understand.", 'simpler'], ['Explain more simply', 'simpler'], ['Can you repeat that?', 'repeat'], ['Please repeat the second instruction', 'repeat'], ['Why is this mentioned?', 'why'], ['What does BID mean?', 'define'], ['Explain it in Hindi', 'language'], ['What should I do today?', 'today'], ['Show the original instruction', 'original'], ["I'm tired. Tell me only the important things.", 'important'], ['Explain slowly', 'slower'], ['Speak in Hindi', 'language']];
  for (const [q, intent] of cases) assert.equal(classify(q).intent, intent, q);
  assert.equal(classify('Please repeat the second instruction').ordinal, 1);
  assert.equal(classify('Speak in Hindi').switchTo, 'hi');
});

test('grounded answers: present facts answered from the document; absent facts → "not in your document"', () => {
  const plan = extractInstructions(pagesFromPlainText('Medications\nTake amoxicillin 500 mg by mouth three times daily for 7 days.\nFollow up with Dr. Rao on October 22, 2026 at 10:30 AM at Northside Family Clinic.'));
  const ctx = { plan, day: buildDay(plan, { date: '2026-10-17' }), lang: 'en' };
  assert.match(answerLocally('Follow-up appointment kab hai?', ctx).answer, /October 22, 2026.*10:30 AM.*Northside Family Clinic/);
  assert.match(answerLocally('¿Cuándo es mi cita?', ctx).answer, /22 de octubre de 2026/);
  assert.match(answerLocally('दवा कब लेनी है?', ctx).answer, /दिन में तीन बार/);
  assert.equal(answerLocally('Can I eat mangoes?', ctx).notFound, true);
  assert.match(answerLocally('Why do I take amoxicillin?', ctx).answer, /doesn’t explain why/);
  const open = answerLocally('Is amoxicillin okay with my breakfast?', ctx);
  assert.equal(open.needsAI, true); assert.ok(open.items.length >= 1 && open.items.length <= 3);
});
