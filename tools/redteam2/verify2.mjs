const R = '' + new URL('../../public/ext', import.meta.url).pathname + '';
const { extractInstructions } = await import(`${R}/clinical/engine.js`);
const { pagesFromPlainText } = await import(`${R}/document/layout.js`);
const { verifyExplanation } = await import(`${R}/clinical/fidelity.js`);
const item = (src) => extractInstructions(pagesFromPlainText(`Discharge instructions:\n${src}`)).items[0] || null;
const T = [
  ['Aspirin 75 mg once daily.', 'hi', 'Aspirin 75 mg हफ़्ते में एक बार लें।', false],
  ['Aspirin 75 mg once daily.', 'hi', 'Aspirin 75 mg महीने में एक बार लें।', false],
  ['Metformin 500 mg twice daily with food.', 'hi', 'Metformin 500 mg दिन में दो बार खाली पेट लें।', false],
  ['Metformin 500 mg twice daily with food.', 'hi', 'Metformin 500 mg दिन में दो बार खाने के बिना लें।', false],
  ['Paracetamol 500 mg every 6 hours as needed for pain.', 'hi', 'Paracetamol 500 mg हर 6 घंटे में लें।', false],
  ['Paracetamol 500 mg every 6 hours as needed for pain.', 'hi', 'Paracetamol 500 mg हर 6 घंटे में, सिर्फ़ ज़रूरत पड़ने पर लें।', true],
  ['Do not take Ibuprofen.', 'hi', 'Ibuprofen लेना ना भूलें।', false],
  ['Do not take Ibuprofen.', 'hi', 'Ibuprofen लेते रहें।', false],
  ['Do not take Ibuprofen.', 'hi', 'Ibuprofen ज़रूर लें।', false],
  ['Do not take Ibuprofen.', 'hi', 'Ibuprofen न लें, ऐसा नहीं है।', false],
  ['Aspirin 75 mg once daily.', 'hi', 'Aspirin 75 mg दिन में एक बार लें, दर्द होने पर ही।', false],
  ['Amoxicillin 500 mg three times daily for 7 days.', 'hi', 'Amoxicillin 500 mg दिन में तीन बार 7 दिन तक लें, ठीक लगे तो बंद कर दें।', false],
  ['Amoxicillin 500 mg three times daily for 7 days.', 'hi', 'Amoxicillin 500 mg दिन में तीन बार सात दिन तक लें।', true],
  ['Amoxicillin 500 mg three times daily for 7 days.', 'hi', 'Amoxicillin 500 mg दिन में तीन बार 7 महीने तक लें।', false],
  ['Furosemide 40 mg in the morning.', 'hi', 'Furosemide 40 mg रात को लें।', false],
  ['Aspirin 75 mg once daily.', 'es', 'Tome Aspirin 75 mg una vez al mes.', false],
  ['Aspirin 75 mg once daily.', 'es', 'Tome Aspirin 75 mg solo si tiene dolor, una vez al día.', false],
  ['Do not take Ibuprofen.', 'es', 'Tome Ibuprofen sin falta.', false],
  ['Do not take Ibuprofen.', 'es', 'No olvide tomar Ibuprofen.', false],
  ['Do not take Ibuprofen.', 'es', 'No se olvide de Ibuprofen.', false],
  ['Do not take Ibuprofen.', 'es', 'Ibuprofen: no es necesario evitarlo.', false],
  ['Amoxicillin 500 mg three times daily for 7 days.', 'es', 'Tome Amoxicillin 500 mg tres veces al día durante 7 días; puede dejarlo cuando se sienta mejor.', false],
  ['Paracetamol 500 mg every 6 hours as needed for pain.', 'es', 'Tome Paracetamol 500 mg cada 6 horas, aunque no tenga dolor.', false],
  ['Paracetamol 500 mg every 6 hours as needed for pain.', 'en', 'Take paracetamol 500 mg every 6 hours as needed for pain, even if you have no pain.', false],
  ['Paracetamol 500 mg every 6 hours as needed for pain.', 'en', 'Take paracetamol 500 mg every 6 hours as needed for pain, around the clock.', false],
  ['Hold metformin 500 mg until review.', 'en', 'Keep taking metformin 500 mg until review.', false],
  ['Hold metformin 500 mg until review.', 'en', 'Metformin 500 mg: resume now; hold only until review.', false],
  ['Hold metformin 500 mg until review.', 'es', 'Continúe Metformin 500 mg hasta la revisión.', false],
  ['Hold metformin 500 mg until review.', 'hi', 'Metformin 500 mg समीक्षा तक लेते रहें।', false],
  ['Insulin glargine 20 units at bedtime.', 'en', 'Inject insulin glargine 20 units at bedtime, plus extra units if your sugar is high.', false],
  ['Insulin glargine 20 units at bedtime.', 'en', 'Inject insulin glargine 2 0 units at bedtime.', false],
  ['Insulin glargine 20 units at bedtime.', 'en', 'Inject insulin glargine 20 IU at bedtime.', true],
  ['Warfarin 5 mg once daily.', 'en', 'Take warfarin 5 mg once a day with ibuprofen for pain.', false],
  ['Warfarin 5 mg once daily.', 'en', 'Take warfarin 5 mg once a day; skip it on weekends.', false],
  ['Warfarin 5 mg once daily.', 'en', 'Take warfarin 5 mg once daily, every other day.', false],
  ['Cetirizine 10 mg at bedtime.', 'en', 'Take cetirizine 10 mg at bedtime as needed.', false],
];
let i = 0;
for (const [src, lang, exp, expectOk] of T) {
  const v = verifyExplanation({ sourceText: src, item: item(src), explanation: exp, lang });
  console.log(`${v.ok !== expectOk ? '!!' : 'ok'} #${i++} [${lang}] expect=${expectOk} got=${v.ok} exp=${JSON.stringify(exp)}${v.ok ? '' : ' fail=' + v.failures.map(f => f.code).join(',')}`);
}
