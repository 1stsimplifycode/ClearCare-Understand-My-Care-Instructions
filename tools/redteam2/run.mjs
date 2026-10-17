// Red-team round 2: new adversarial inputs. Usage: node run.mjs [filter]
const R = '' + new URL('../../public/ext', import.meta.url).pathname + '';
const { extractInstructions } = await import(`${R}/clinical/engine.js`);
const { pagesFromPlainText } = await import(`${R}/document/layout.js`);
const { renderItemSafe } = await import(`${R}/clinical/render.js`);
const { verifyExplanation } = await import(`${R}/clinical/fidelity.js`);
const { buildDay, buildBriefing } = await import(`${R}/calendar/briefing.js`);
const { answerLocally } = await import(`${R}/qa/intent.js`);

export const CASES = [
  // multi-line sections
  'DISCHARGE MEDICATIONS\n1) Bisoprolol 2.5mg OD\n2) Ramipril 2.5 mg BD\nWARNINGS\nRush to hospital if chest pain.\nFOLLOW UP\nReview in OPD on 3/11',
  '• Torsemide 10 mgs once a day\n• Potassium chloride 600 MG twice a day\n• Dial 108 if breathless',
  'Name | Dose | Frequency\nApixaban | 5 mg | twice daily\nMetoprolol | 25 mg | once daily',
  'Apixaban 5 mg twice daily\nfor 3 months',
  'Tab Amlodipine\n5 mg\nonce daily',
  // ranges
  'Tramadol 50 mg every 4-6 hours as needed for pain.',
  'Salmeterol inhaler 1 or 2 puffs twice daily.',
  'Morphine oral solution 5-10 mg every 4 hours when required.',
  'Take 1-2 tablets of co-codamol 30/500 up to four times a day.',
  'Oxycodone 5 mg every 4 to 6 hours prn pain.',
  'Lactulose 10-20 ml twice daily.',
  // units
  'Vitamin D3 60000 IU once weekly for 8 weeks.',
  'Methotrexate 15 mg once weekly on Mondays.',
  'Alendronate 70 mg once a week, take on an empty stomach and stay upright for 30 minutes.',
  'Cholecalciferol 60,000 IU monthly.',
  'Paracetamol syrup 5 ml three times a day.',
  'Ibuprofen suspension 1 tsp every 8 hours.',
  'Amoxicillin 250 milligram three times daily.',
  'Ondansetron 4 MG IV q8h.',
  'Lactulose 15 cc at night.',
  'Vitamin B12 1000 mcg injection monthly.',
  // insulin
  'Insulin glargine 20 units at bedtime.',
  'Insulin lispro per sliding scale before meals.',
  'Humalog 4-8 units before meals according to sugar.',
  'Insulin glargine 18 U at night. Insulin aspart 6 U with meals.',
  'Lantus 10 units once daily; if sugar < 70 skip dose.',
  // forms
  'Fentanyl patch 25 mcg/hr every 72 hours.',
  'Nitroglycerin patch apply once daily, remove at night.',
  'Timolol 0.5% eye drops 1 drop in each eye twice daily.',
  'Ciprofloxacin ear drops 3 drops in left ear twice daily for 7 days.',
  'Budesonide/formoterol 200/6 inhaler 2 puffs twice daily.',
  'Enoxaparin 40 mg subcutaneous injection once daily for 10 days.',
  'Enoxaparin 40 mg SC OD x 10 days.',
  // duration/timing
  'Cefixime 200 mg twice daily until finished.',
  'Prednisolone 30 mg daily for 1 week then stop.',
  'Start clopidogrel 75 mg once daily tomorrow.',
  'Restart warfarin on Monday, 3 mg daily.',
  'Restart metformin 500 mg twice daily after 48 hours if kidney test normal.',
  'Do not forget to take your aspirin 75 mg daily.',
  'Do not miss any dose of tenofovir 300 mg once daily.',
  'Continue levetiracetam 500 mg twice daily unless told otherwise.',
  'Take paracetamol 500 mg; if pain persists take another after 4 hours.',
  'Hold amlodipine 5 mg if systolic <100.',
  'Hold metoprolol if pulse less than 55.',
  'Tranexamic acid 500 mg three times daily, stop when bleeding stops.',
  'Furosemide 40 mg OD. Stop furosemide if weight drops below 60 kg.',
  'Avoid NSAIDs like ibuprofen 400 mg.',
  'Never take aspirin and warfarin together.',
  'Aspirin was stopped.',
  'Previously on atenolol 50 mg - discontinued.',
  'Atenolol 50 mg: discontinued on admission, not restarted.',
  'Stopped: simvastatin 40 mg nightly.',
  'Cease ramipril.',
  'Hold off on lisinopril for 1 week.',
  'Avoid taking metformin until review.',
  'Pause apixaban for 2 days before procedure.',
  'Tab Ecosprin 75 mg - omit.',
  // language mixes
  'Tomar metformina 500 mg dos veces al día.',
  'No tome ibuprofeno 400 mg.',
  'मेटफॉर्मिन 500 mg दिन में दो बार लें।',
  'एस्पिरिन 75 mg न लें।',
  'Aspirin 75 mg roz ek baar.',
  // appointments / emergency
  'See Dr. Rao next Monday.',
  'Return in 2 weeks for suture removal.',
  'Follow-up with cardiology in 6 weeks.',
  'Review in OPD on 3/11 with reports.',
  'Repeat CBC on 20/10/2026.',
  'Rush to hospital if you vomit blood.',
  'Dial 108 or go to nearest emergency if seizure lasts more than 5 minutes.',
  // tricky numbers
  'Co-amoxiclav 1.2 g IV 8 hourly, switch to oral 625 mg TDS on day 3.',
  'Take 2 x 500 mg tablets twice daily.',
  'Levothyroxine 100 mcg daily, 112 mcg on Sundays.',
  'Warfarin 3 mg Mon/Wed/Fri and 1.5 mg other days. INR on 24/10.',
  'Bed 12, Ward 4B: Amlodipine 10 mg once daily.',
  'Diazepam 5 mg at night for 3 nights only.',
  'Iron sucrose 200 mg in 100 ml NS over 30 min.',
  'Aspirin 75mg/clopidogrel 75mg once daily.',
  'Metformin 500 mg 1-0-1 after food, glimepiride 1 mg 1-0-0.',
  'Pantoprazole 40 mg BBF.',
  'Tab. Dolo 650 SOS.',
  'Calcium 500 mg twice daily, 2 hours apart from levothyroxine.',
];

const QA = [
  ['Can I drink alcohol with metronidazole?', 'Metronidazole 400 mg three times daily for 7 days.'],
  ['Can I take ibuprofen for my headache?', 'Paracetamol 500 mg every 6 hours as needed.'],
  ['What if I miss a dose of warfarin?', 'Warfarin 3 mg once daily.'],
  ['Can I double the dose if pain is bad?', 'Tramadol 50 mg every 6 hours as needed for pain.'],
  ['How much insulin should I take if sugar is 300?', 'Insulin glargine 20 units at bedtime.'],
  ['Should I stop aspirin before my dental work?', 'Aspirin 75 mg once daily.'],
  ['How many tablets of crocin can I take?', 'Paracetamol 500 mg every 6 hours as needed.'],
  ['When should I take metformin?', 'Hold metformin 500 mg until review.'],
  ['How much aspirin?', 'Do not take aspirin 75 mg.'],
  ['Is it safe to drive?', 'Diazepam 5 mg at night.'],
  ['Can I take it with food?', 'Amlodipine 5 mg once daily.'],
  ['kya main sharab pi sakta hoon?', 'Metronidazole 400 mg three times daily.'],
  ['¿Puedo tomar más pastillas si me duele?', 'Tramadol 50 mg every 6 hours as needed for pain.'],
  ['When is my next dose of warfarin?', 'Warfarin 3 mg once daily.'],
  ['What is the dose of warfarin 5 mg?', 'Warfarin 3 mg once daily.'],
  ['When should I take insulin?', 'Insulin lispro per sliding scale before meals.'],
];

const filt = process.argv[2];
for (const [i, text] of CASES.entries()) {
  if (filt && !String(i).match(new RegExp(`^(${filt})$`))) continue;
  const plan = extractInstructions(pagesFromPlainText(`Discharge instructions:\n${text}`));
  console.log(`\n=== #${i} ${JSON.stringify(text)}`);
  for (const it of plan.items) {
    console.log(`  [${it.category}] name=${it.name} st=${it.status} str=${JSON.stringify(it.strength && [it.strength.value, it.strength.unit])} q=${JSON.stringify(it.quantity && [it.quantity.value, it.quantity.unit])} f=${JSON.stringify(it.frequency && { t: it.frequency.timesPerDay, h: it.frequency.everyHours, prn: it.frequency.prn, tm: it.frequency.timing, ev: it.frequency.everyDays, w: it.frequency.weekly })} dur=${JSON.stringify(it.duration)} max=${JSON.stringify(it.maxDaily)} date=${it.date || ''} cond=${it.condition || ''} cl=${it.clarity} sched=${it.schedulable} rs=${(it.reasons || []).map(r => r.code).join(',')}`);
    console.log(`     text=${JSON.stringify(it.text)}`);
    for (const lang of ['en', 'es', 'hi']) console.log(`     ${lang}: ${renderItemSafe(it, lang, 'simple').text}`);
  }
  for (const o of plan.other || []) console.log(`  other: ${o.text}`);
  const day = buildDay(plan, { date: '2026-10-17' });
  const br = buildBriefing(day, { lang: 'en', part: 'morning' });
  console.log('  BRIEF: ' + br.filter(s => !['greeting', 'intro', 'closing'].includes(s.kind)).map(s => `<${s.kind}> ${s.text}`).join(' | '));
}
if (!filt || filt === 'qa') for (const [q, doc] of QA) {
  const plan = extractInstructions(pagesFromPlainText(`Discharge instructions:\n${doc}`));
  const day = buildDay(plan, { date: '2026-10-17' });
  const a = answerLocally(q, { plan, day, lang: 'en' });
  console.log(`\nQA ${JSON.stringify(q)} | doc=${JSON.stringify(doc)}\n  intent=${a.intent} needsAI=${!!a.needsAI} notFound=${!!a.notFound} answer=${a.answer || ''} fallback=${a.fallback || ''}`);
}
