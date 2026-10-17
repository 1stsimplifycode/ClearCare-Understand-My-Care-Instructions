const R = new URL('../../public/ext', import.meta.url).href;
const { extractInstructions } = await import(`${R}/clinical/engine.js`);
const { pagesFromPlainText } = await import(`${R}/document/layout.js`);
const { renderItem } = await import(`${R}/clinical/render.js`);
const { buildDay, buildBriefing } = await import(`${R}/calendar/briefing.js`);

const CASES = [
  'Metformin 500 mg 1-0-1 after food.',
  'Metformin 500 mg BD.',
  'Atorvastatin 10 mg HS.',
  'Aspirin 75 mg once daily, room 12, bed 4.',
  'Warfarin 3 mg once daily; INR target 2-3.',
  'Amlodipine 5 mg once daily. Ward 7.',
  'Paracetamol 500 mg 1-2 tablets every 6 hours as needed, max 4 doses/day.',
  'Metoprolol 25 mg: take 1/2 tablet twice daily.',
  'Amoxicillin 500 mg 1 tab PO q12h x5d.',
  'Take paracetamol 650 mg every 6 hours as needed for fever.',
  'Aspirin 75 mg once daily.\nAspirin: do not take for 5 days before surgery.',
  'Metformin 500 mg twice daily.\nMetformin should be held for 48 hours.',
  'Take omeprazole 20 mg once daily. Do not take omeprazole 40 mg.',
];
for (const text of CASES) {
  const plan = extractInstructions(pagesFromPlainText(`Discharge medications:\n${text}`));
  console.log(`\n=== ${text.replace(/\n/g, ' / ')}`);
  for (const it of plan.items.filter(x => x.category === 'medication')) {
    console.log(`  name=${it.name} status=${it.status} str=${JSON.stringify(it.strength && [it.strength.value, it.strength.unit])} qty=${JSON.stringify(it.quantity && [it.quantity.value, it.quantity.unit])} freq=${JSON.stringify({ t: it.frequency.timesPerDay, prn: it.frequency.prn, tm: it.frequency.timing })} clarity=${it.clarity} sched=${it.schedulable} reasons=${it.reasons.map(r => r.code)}`);
    for (const lang of ['en', 'es', 'hi']) console.log(`   [${lang}/steps] ${JSON.stringify(renderItem(it, lang, 'steps'))}`);
  }
  const day = buildDay(plan, { date: '2026-10-17', done: new Set(plan.items.map(i => `${i.id}:2026-10-17:0`)) });
  for (const lang of ['en', 'hi']) console.log(`  BRIEF[${lang}]: ` + buildBriefing(day, { lang, part: 'evening' }).filter(s => !['greeting', 'intro', 'closing'].includes(s.kind)).map(s => `{${s.kind}} ${s.text}`).join(' || '));
}
