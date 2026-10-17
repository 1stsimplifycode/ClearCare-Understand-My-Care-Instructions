// Adversarial explanations for verifyExplanation. Each should be REJECTED (ok:false) unless marked good.
const R = '' + new URL('../../public/ext', import.meta.url).pathname + '';
const { extractInstructions } = await import(`${R}/clinical/engine.js`);
const { pagesFromPlainText } = await import(`${R}/document/layout.js`);
const { verifyExplanation } = await import(`${R}/clinical/fidelity.js`);

const item = (src) => extractInstructions(pagesFromPlainText(`Discharge instructions:\n${src}`)).items[0] || null;
const T = [
  // [source, lang, explanation, expectOk]
  ['Paracetamol 500 mg every 6 hours as needed for pain.', 'en', 'Take paracetamol 500 mg every 6 hours for pain.', false],
  ['Paracetamol 500 mg every 6 hours as needed for pain.', 'en', 'Take paracetamol 500 mg every 6 hours as needed for pain.', true],
  ['Levothyroxine 50 mcg once daily.', 'en', 'Take levothyroxine 50 mg once a day.', false],
  ['Levothyroxine 50 mcg once daily.', 'en', 'Take levothyroxine 50 micrograms once a day.', true],
  ['Insulin glargine 20 units at bedtime.', 'en', 'Inject insulin 20 mL at bedtime.', false],
  ['Insulin glargine 20 units at bedtime.', 'en', 'Inject insulin 20 units in the morning.', false],
  ['Amoxicillin 500 mg three times daily for 7 days.', 'en', 'Take amoxicillin 500 mg three times a day for 7 weeks.', false],
  ['Amoxicillin 500 mg three times daily for 7 days.', 'en', 'Take amoxicillin 500 mg three times a day for a week.', false],
  ['Amoxicillin 500 mg three times daily for 7 days.', 'en', 'Take amoxicillin 500 mg three times a day for seven days.', true],
  ['Amoxicillin 500 mg three times daily for 7 days.', 'en', 'Take amoxicillin 500 mg every 3 hours for 7 days.', false],
  ['Amoxicillin 500 mg three times daily for 7 days.', 'en', 'Take amoxicillin 500 mg three times a day for 7 days, and you may stop when you feel better.', false],
  ['Do not take ibuprofen.', 'en', "Don't forget to take ibuprofen.", false],
  ['Do not take ibuprofen.', 'en', 'Never skip ibuprofen.', false],
  ['Do not take ibuprofen.', 'en', 'It is not true that you should avoid ibuprofen.', false],
  ['Aspirin 75 mg once daily.', 'en', 'Do not stop aspirin 75 mg; take it once a day.', true],
  ['Aspirin 75 mg once daily.', 'en', 'Take aspirin 75 mg once a day only if you have pain.', false],
  ['Aspirin 75 mg once daily.', 'en', 'Take aspirin 75 mg once a day, or twice if you forget.', false],
  ['Metformin 500 mg twice daily with food.', 'en', 'Take metformin 500 mg twice a day on an empty stomach.', false],
  ['Metformin 500 mg twice daily with food.', 'en', 'Take metformin 500 mg twice a day without food.', false],
  ['Metformin 500 mg twice daily with food.', 'en', 'Take metformin 0.5 g twice a day with food.', true],
  ['Metformin 500 mg twice daily with food.', 'en', 'Take metformin five hundred milligrams twice a day with food.', true],
  ['Metformin 500 mg twice daily with food.', 'en', 'Take metformin fifty milligrams twice a day with food.', false],
  ['Furosemide 40 mg in the morning.', 'en', 'Take furosemide 40 mg at night.', false],
  ['Furosemide 40 mg in the morning.', 'en', 'Take Lasix 40 mg in the morning.', false],
  ['Warfarin 5 mg once daily.', 'en', 'Take warfarin 5 mg once a day. You can also take aspirin.', false],
  ['Lactulose 15 mL twice daily.', 'en', 'Take lactulose 15 teaspoons twice a day.', false],
  ['Lactulose 15 mL twice daily.', 'en', 'Take lactulose 1 tablespoon twice a day.', false],
  // Spanish
  ['Paracetamol 500 mg every 6 hours as needed for pain.', 'es', 'Tome paracetamol 500 mg cada 6 horas para el dolor.', false],
  ['Paracetamol 500 mg every 6 hours as needed for pain.', 'es', 'Tome paracetamol 500 mg cada 6 horas solo si lo necesita para el dolor.', true],
  ['Do not take ibuprofen.', 'es', 'No deje de tomar ibuprofeno.', false],
  ['Do not take ibuprofen.', 'es', 'Siga tomando ibuprofeno sin olvidar ninguna dosis.', false],
  ['Do not take ibuprofen.', 'es', 'Nunca olvide tomar ibuprofeno.', false],
  ['Aspirin 75 mg once daily.', 'es', 'No tome aspirina 75 mg una vez al día.', false],
  ['Aspirin 75 mg once daily.', 'es', 'Tome aspirina 75 mg una vez por semana.', false],
  ['Aspirin 75 mg once daily.', 'es', 'Tome aspirina 75 mg cada día, dos veces.', false],
  ['Levothyroxine 50 mcg once daily.', 'es', 'Tome levotiroxina 50 mg una vez al día.', false],
  ['Amoxicillin 500 mg three times daily for 7 days.', 'es', 'Tome amoxicilina 500 mg tres veces al día durante 7 semanas.', false],
  ['Amoxicillin 500 mg three times daily for 7 days.', 'es', 'Tome amoxicilina 500 mg tres veces al día durante 17 días.', false],
  ['Metformin 500 mg twice daily with food.', 'es', 'Tome metformina 500 mg dos veces al día en ayunas.', false],
  ['Metformin 500 mg twice daily with food.', 'es', 'Tome metformina 500 mg dos veces al día sin comida.', false],
  // Hindi
  ['Paracetamol 500 mg every 6 hours as needed for pain.', 'hi', 'पैरासिटामोल 500 mg हर 6 घंटे में दर्द के लिए लें।', false],
  ['Do not take ibuprofen.', 'hi', 'आइबुप्रोफ़ेन लेना ना भूलें।', false],
  ['Do not take ibuprofen.', 'hi', 'आइबुप्रोफ़ेन लेना मत भूलिए।', false],
  ['Do not take ibuprofen.', 'hi', 'आइबुप्रोफ़ेन लेना बंद न करें।', false],
  ['Aspirin 75 mg once daily.', 'hi', 'एस्पिरिन 75 mg दिन में एक बार न लें।', false],
  ['Aspirin 75 mg once daily.', 'hi', 'एस्पिरिन 75 mg हफ़्ते में एक बार लें।', false],
  ['Aspirin 75 mg once daily.', 'hi', 'एस्पिरिन 75 ग्राम दिन में एक बार लें।', false],
  ['Levothyroxine 50 mcg once daily.', 'hi', 'लेवोथायरोक्सिन 50 मिलीग्राम दिन में एक बार लें।', false],
  ['Amoxicillin 500 mg three times daily for 7 days.', 'hi', 'एमोक्सिसिलिन 500 mg दिन में तीन बार 7 हफ़्ते तक लें।', false],
  ['Metformin 500 mg twice daily with food.', 'hi', 'मेटफॉर्मिन 500 mg दिन में दो बार खाली पेट लें।', false],
  ['Insulin glargine 20 units at bedtime.', 'hi', 'इंसुलिन 20 यूनिट सुबह लें।', false],
  ['Insulin glargine 20 units at bedtime.', 'hi', 'इंसुलिन २० यूनिट सोने से पहले लें।', true],
  ['Insulin glargine 20 units at bedtime.', 'hi', 'इंसुलिन २ यूनिट सोने से पहले लें।', false],
];
let i = 0;
for (const [src, lang, exp, expectOk] of T) {
  const it = item(src);
  const v = verifyExplanation({ sourceText: src, item: it, explanation: exp, lang });
  const bad = v.ok !== expectOk;
  console.log(`${bad ? '!!' : 'ok'} #${i++} [${lang}] expect=${expectOk} got=${v.ok} src=${JSON.stringify(src)} exp=${JSON.stringify(exp)}${v.ok ? '' : ' fail=' + v.failures.map(f => f.code).join(',')}`);
}
