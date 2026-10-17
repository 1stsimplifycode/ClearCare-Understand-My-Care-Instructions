const R = new URL('../../public/ext', import.meta.url).href;
const { extractInstructions } = await import(`${R}/clinical/engine.js`);
const { pagesFromPlainText } = await import(`${R}/document/layout.js`);
const { renderItem } = await import(`${R}/clinical/render.js`);
const { verifyExplanation } = await import(`${R}/clinical/fidelity.js`);
const { buildDay, buildBriefing } = await import(`${R}/calendar/briefing.js`);
const { toSpeech, verifySpeech } = await import(`${R}/speech/normalize.js`);

const CASES = [
  'Amoxicillin 500 mg 1 tab PO q12h x5d.',
  'Tab. Pan 40 OD before breakfast.',
  'Hold metformin 48 hrs after contrast.',
  'Resume warfarin tomorrow at 5 mg.',
  'Increase atorvastatin to 40 mg at night.',
  'Digoxin 0.125 mg once daily.',
  'Metoprolol 25 mg: take 1/2 tablet twice daily.',
  'Salbutamol inhaler two puffs every 4 hours as needed for shortness of breath.',
  'Furosemide 40 mg every other day.',
  'Take amlodipine 5 mg daily but do not take it if your blood pressure is below 100.',
  '1. Aspirin 75 mg OD',
  '2. Clopidogrel 75 mg once daily after lunch.',
  'Paracetamol 500 mg 1-2 tablets every 6 hours as needed, max 4 doses/day.',
  'Dolo 650 1 tab TDS for 3 days.',
  'Crocin 500mg twice a day.',
  'Ecosprin 75 once daily.',
  'Do not take ibuprofen.',
  'Ibuprofen: do not take.',
  'Please do not take Brufen 400 mg with this medicine.',
  'You should not take naproxen 500 mg twice daily any more.',
  'Stop aspirin 75 mg daily.',
  'Lisinopril 10 mg daily - discontinue.',
  'Losartan 50 mg once daily. Stop losartan.',
  'Metformin 500 mg twice daily; hold for 48 hours after your CT scan.',
  'Amoxicillin-clavulanate 625 mg three times a day for 7 days.',
  'Augmentin 625 TDS x 7 days.',
  'Pantoprazole 40 mg once daily on an empty stomach, 30 minutes before breakfast.',
  'Omeprazole 20 mg once daily for 14 days, then 20 mg as needed.',
  'Prednisolone 40 mg once daily for 5 days then 20 mg once daily for 5 days.',
  'Cetirizine 10 mg at bedtime.',
  'Atorvastatin 20 mg once daily. Atorvastatin 40 mg once daily.',
  'Levothyroxine 50 mcg once daily on an empty stomach.',
  'Thyronorm 75 mcg once daily before breakfast.',
  'Montelukast 10 mg nightly.',
  'Ondansetron 4 mg every 8 hours if nausea.',
  'Gabapentin 300 mg three times daily; do not stop suddenly.',
  'Sertraline 50 mg once daily, do not stop taking unless told by your doctor.',
  'Escitalopram 10 mg once a day. Never take more than 20 mg a day.',
  'Cephalexin 500 mg four times daily for 10 days.',
  'Ciprofloxacin 500 mg twice daily for 5 days. Do not take with milk.',
  'Doxycycline 100 mg BID x 14 days.',
  'Metronidazole 400 mg TID for 7 days. Avoid alcohol.',
  'Nitrofurantoin 100 mg twice daily for 5 days.',
  'Spironolactone 25 mg once daily. Call 108 if you feel faint.',
  'Hydrochlorothiazide 12.5 mg once daily.',
  'Carvedilol 6.25 mg twice daily with food.',
  'Telmisartan 40 mg once daily. Phone 9876543210 for queries.',
  'Rosuvastatin 10 mg once daily starting 20 October 2026.',
  'Famotidine 20 mg twice daily for 2 weeks.',
  'Docusate 100 mg twice daily as needed for constipation.',
  'Senna 2 tablets at bedtime.',
  'Lactulose 15 mL twice daily.',
  'Take esomeprazole 40 mg once daily, not twice daily.',
  'Continue amlodipine 5 mg once daily. Do not take amlodipine if dizzy.',
  'Atenolol 50 mg once daily; skip the dose if pulse below 60.',
  'Take metformin 1000 mg twice daily (previously 500 mg).',
  'Change losartan from 25 mg to 50 mg once daily.',
  'Reduce furosemide to 20 mg once daily.',
  'Stop taking cefuroxime after 3 days.',
  'Take azithromycin 500 mg once daily for 3 days, do not take it on an empty stomach.',
  'Pregabalin 75 mg at night. Stop if drowsy.',
  'Clopidogrel 75 mg once daily for 12 months, do not stop without speaking to your cardiologist.',
  'Paracetamol 1 g four times a day.',
  'Paracetamol 1g every 6 hours, maximum 4 g in 24 hours.',
  'Take Lasix 40mg in the morning and 20mg in the afternoon.',
  'Amlodipine 5 mg OD for BP, 10 mg if BP > 160.',
  'Metoprolol 2.5 mg once daily.',
  'Ramipril 5 mg once daily.',
  'Take 2 tablets of Brufen daily.',
  'Atorvastatin 10 mg once daily x 30 days.',
  'Hold aspirin until review on 25 Oct 2026.',
  'Aspirin 75 mg once daily — NOT to be taken before surgery.',
  'Take warfarin 5 mg daily except Sunday.',
  'Pan-D 40 once daily before breakfast.',
  'Do not resume metformin.',
  'Metformin should be held.',
  'Metformin: on hold.',
  'Glucophage 500 mg: withheld for now.',
  'Take amoxicillin 500 mg three times daily for 5 days, and take it 2 hours after food.',
  'Cetirizine 10 mg once daily for 1 week. Do NOT take with alcohol.',
];

const out = [];
const P = (...a) => out.push(a.join(' '));
const flagged = [];
const flag = (i, inv, msg) => flagged.push(`#${i} [inv${inv}] ${msg}`);

for (const [i, text] of CASES.entries()) {
  const doc = pagesFromPlainText(`Discharge medications:\n${text}`);
  const plan = extractInstructions(doc);
  P(`\n=== #${i} ${text}`);
  for (const it of plan.items) {
    P(`  cat=${it.category} name=${it.name} status=${it.status} str=${JSON.stringify(it.strength && { v: it.strength.value, u: it.strength.unit })} qty=${JSON.stringify(it.quantity && { v: it.quantity.value, u: it.quantity.unit })} freq=${JSON.stringify(it.frequency && { t: it.frequency.timesPerDay, h: it.frequency.everyHours, prn: it.frequency.prn, tm: it.frequency.timing })} dur=${JSON.stringify(it.duration && it.duration.value ? [it.duration.value, it.duration.unit] : null)} clarity=${it.clarity} sched=${it.schedulable} reasons=${(it.reasons || []).map(r => r.code).join(',')} taper=${JSON.stringify(it.taper)} max=${JSON.stringify(it.maxDaily && [it.maxDaily.value, it.maxDaily.unit])} cond=${it.condition ?? ''}`);
    for (const lang of ['en', 'es', 'hi']) {
      const r = renderItem(it, lang, 'simple');
      P(`   [${lang}] ${r.text}`);
      if (it.category === 'medication') {
        if (['STOP', 'HOLD'].includes(it.status)) {
          if (it.schedulable) flag(i, 2, 'STOP/HOLD schedulable');
        }
        if (it.clarity === 'clear' && lang === 'en') {
          const v = verifyExplanation({ sourceText: it.text, item: it, explanation: r.text, lang });
          if (!v.ok) P(`   verify-own-render FAIL ${JSON.stringify(v.failures.map(f => f.code))}`);
        }
        const sp = toSpeech(r.text, lang); const vs = verifySpeech(r.text, sp, lang);
        if (!vs.ok) P(`   speech FAIL ${JSON.stringify(vs.failures)} :: ${sp}`);
      }
    }
  }
  for (const o of plan.other) P(`  other: ${o.text}`);
  const day = buildDay(plan, { date: '2026-10-17' });
  const br = buildBriefing(day, { lang: 'en' });
  const meds = br.filter(s => s.kind === 'medication').map(s => s.text);
  if (meds.length) P(`  BRIEF-TASK: ${meds.join(' | ')}`);
  for (const m of day.medications) if (m.item.clarity !== 'clear' || ['STOP', 'HOLD'].includes(m.item.status)) flag(i, 6, 'unclear/stop item as task');
  if (br.some(s => /\b(?:you took|you have taken|already taken|was taken)\b/i.test(s.text))) flag(i, 6, 'taken claim');
}

// ---- adversarial verifier explanations ----
const ADV = [
  // [source, itemFromCase(index or null), explanation, lang]
  ['Digoxin 0.125 mg once daily.', 'Take digoxin 0.25 mg once a day. 0.125', 'en'],
  ['Warfarin 5 mg once daily.', 'Take warfarin five mg once daily.', 'en'],
  ['Warfarin 5 mg once daily.', 'Take warfarin 5 mg twice daily. Not once.', 'en'],
  ['Metoprolol 25 mg twice daily.', 'Take metoprolol 25 mg once a day, twice if needed.', 'en'],
  ['Do not take ibuprofen 400 mg.', 'Take ibuprofen 400 mg. It is not dangerous.', 'en'],
  ['Stop aspirin 75 mg.', 'Keep taking aspirin 75 mg, do not stop.', 'en'],
  ['Stop aspirin 75 mg.', 'Siga tomando aspirin 75 mg, no lo olvide.', 'es'],
  ['Stop aspirin 75 mg.', 'aspirin 75 mg लेते रहें, बंद न करें।', 'hi'],
  ['Levothyroxine 50 mcg once daily.', 'Take levothyroxine 50 mg once a day.', 'en'],
  ['Insulin 10 units at bedtime.', 'Inject insulin 100 units at bedtime.', 'en'],
  ['Insulin 10 units at bedtime.', 'Inject insulin 10 units in the morning, not at bedtime.', 'en'],
  ['Amoxicillin 500 mg three times daily for 5 days.', 'Take amoxicillin 500 mg three times a day for 3 days 5', 'en'],
  ['Amoxicillin 500 mg three times daily for 5 days.', 'Take amoxicillin 500 mg 3 times a day for 5 weeks.', 'en'],
  ['Paracetamol 500 mg every 6 hours as needed.', 'Take paracetamol 500 mg every 6 hours, every day without fail.', 'en'],
  ['Metformin 500 mg twice daily.', 'Take metformin 500 mg twice a day and also glimepiride.', 'en'],
  ['Metformin 500 mg twice daily.', 'Take Glucophage 500 mg twice a day.', 'en'],
  ['Hold metformin for 48 hours.', 'Take metformin, then hold off nothing for 48 hours.', 'en'],
  ['Hold metformin for 48 hours.', 'Tome metformin durante 48 horas sin falta.', 'es'],
  ['Hold metformin for 48 hours.', 'metformin 48 घंटे बिना रुके लें।', 'hi'],
  ['Clopidogrel 75 mg once daily.', 'Take clopidogrel 7.5 mg once a day, 75', 'en'],
  ['Clopidogrel 75 mg once daily.', 'Tome clopidogrel 75 mg dos veces al día, una vez.', 'es'],
  ['Clopidogrel 75 mg once daily.', 'clopidogrel 75 mg दिन में दो बार लें, एक बार।', 'hi'],
  ['Warfarin 5 mg once daily.', 'Take warfarin 5 mg once daily with 2 aspirin.', 'en'],
  ['Call 911 if chest pain.', 'If you have chest pain, wait and call your doctor next week. 911', 'en'],
  ['Do not lift more than 10 pounds for 2 weeks.', 'Lift up to 10 pounds for 2 weeks without worry. Do not stop.', 'en'],
  ['Hydrochlorothiazide 12.5 mg once daily.', 'Take hydrochlorothiazide 125 mg once a day. 12.5', 'en'],
  ['Hydrochlorothiazide 12.5 mg once daily.', 'Take hydrochlorothiazide 12.5 g once a day mg.', 'en'],
  ['Morphine 5 mg every 4 hours as needed.', 'Take morphine 5 mg every 4 hours.', 'en'],
  ['Prednisone 40 mg once daily for 5 days then stop.', 'Take prednisone 40 mg once a day for 5 days, then continue.', 'en'],
  ['Enoxaparin 40 mg SC once daily.', 'Inject enoxaparin 40 mg into a vein once a day.', 'en'],
  ['Aspirin 75 mg once daily.', 'Toma aspirin 75 mg una vez al día y cuatro tabletas mas.', 'es'],
];
for (const [src, exp, lang] of ADV) {
  const plan = extractInstructions(pagesFromPlainText(`Discharge medications:\n${src}`));
  const item = plan.items.find(x => x.category === 'medication') || null;
  const v = verifyExplanation({ sourceText: src, item, explanation: exp, lang });
  out.push(`ADV ${v.ok ? 'ACCEPTED' : 'rejected'} [${lang}] src="${src}" exp="${exp}" ${v.ok ? '' : JSON.stringify(v.failures.map(f => f.code))}`);
}

// ---- speech probes ----
for (const [t, lang] of [['Take 0.5 mg.', 'en'], ['Take .5 mg', 'en'], ['Take 1,000 mg.', 'en'], ['Do not take 2.5mg', 'en'], ['No tome 2,5 mg', 'es'], ['Take 10mg BID', 'en'], ['Take 1.0 mg', 'en'], ['Shouldn\'t take 5 mg', 'en'], ['Take 12.5mg/5mL', 'en'], ['Take 5mcg', 'hi'], ['मत लें 5 mg', 'hi'], ['Do NOT take 5 mg', 'en'], ['Never take aspirin', 'es'], ['Take 1/2 tablet', 'en'], ['Take 0.125 mg', 'hi'], ['Take 10,5 mg', 'en'], ['Take 3.5 g', 'es']]) {
  const s = toSpeech(t, lang); const v = verifySpeech(t, s, lang);
  out.push(`SPEECH [${lang}] "${t}" -> "${s}" ok=${v.ok} ${JSON.stringify(v.failures)}`);
}
console.log(out.join('\n'));
console.log('\nAUTO FLAGS:\n' + flagged.join('\n'));
