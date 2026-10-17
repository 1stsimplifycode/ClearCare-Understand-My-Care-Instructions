const R = '' + new URL('../../public/ext', import.meta.url).pathname + '';
const { extractInstructions } = await import(`${R}/clinical/engine.js`);
const { pagesFromPlainText } = await import(`${R}/document/layout.js`);
const { verifyExplanation } = await import(`${R}/clinical/fidelity.js`);
const { buildReminderIcs } = await import(`${R}/calendar/ics.js`);
const P = (s) => extractInstructions(pagesFromPlainText(`Discharge instructions:\n${s}`));
for (const s of ['Potassium chloride 600 MG twice a day.', 'Potassium chloride 600 mg twice a day.', 'Rush to hospital if chest pain.', 'Go to the emergency department if you have chest pain.', 'Tenofovir 300 mg once daily.', 'Tranexamic acid 500 mg three times daily.', 'Timolol 1 drop twice daily.', 'Salbutamol inhaler 2 puffs twice daily.', 'Return to clinic on 3/11/2026.']) {
  const p = P(s); console.log(JSON.stringify(s), '=>', p.items.map(i => `${i.category}:${i.name}:${i.clarity}`).join(' ; ') || 'NO ITEMS');
}
const src = 'Aspirin 75 mg once daily.'; const it = P(src).items[0];
for (const e of ['Take aspirin 75 mg once a week.', 'Take aspirin 75 mg once a month.', 'Take aspirin 75 mg once daily for 3 days.'])
  console.log(e, verifyExplanation({ sourceText: src, item: it, explanation: e, lang: 'en' }).ok);
const p80 = P('Calcium 500 mg twice daily, 2 hours apart from levothyroxine.');
const lev = p80.items.find(i => i.name === 'levothyroxine');
try { console.log(buildReminderIcs([{ ...lev, item: lev, times: ['08:00', '20:00'], name: lev.name, strength: lev.strength }]).ics.split('\n').filter(l => /SUMMARY/.test(l)).join(' | ')); } catch (e) { console.log('ics err', e.message); }
