// SafetyGate: runs BEFORE any answer is built (rules or AI). ClearCare explains the care a clinician
// already prescribed; it never assesses symptoms, changes a medicine, or prescribes. Urgent symptom
// descriptions always escalate to emergency help, and requests to change care are redirected to the
// care team with the document's own words. Shared by the browser (qa/intent.js) and the server agent.
const L = (en, es, hi) => ({ en, es, hi });
const pick = (o, lang) => o[lang] ?? o.en;

// Urgent symptom phrases (English, Spanish, Hindi, romanised Hindi, Kannada).
const URGENT = new RegExp([
  String.raw`\bchest (?:pain|pressure|tightness)\b|\b(?:can[’']?t|cannot|can not|hard to|trouble|difficulty|struggling to) breath(?:e|ing)\b|\bshort(?:ness)? of breath\b|\bbreathless\b`,
  String.raw`\b(?:faint(?:ed|ing)?|passed out|pass(?:ing)? out|unconscious|unresponsive|collapsed?|seizures?|fits?|convuls\w*)\b`,
  String.raw`\b(?:bleeding (?:won[’']?t|will not|doesn[’']?t|does not) stop|heavy bleeding|bleeding (?:a lot|heavily)|coughing (?:up )?blood|vomiting blood|blood in (?:my )?(?:vomit|stool|urine))\b`,
  String.raw`\b(?:face (?:is )?droop\w*|slurred speech|can[’']?t speak|weak(?:ness)? on one side|numb(?:ness)? on one side|stroke)\b`,
  String.raw`\b(?:swelling of (?:my )?(?:face|lips|tongue|throat)|throat (?:is )?closing|anaphyla\w*|severe allergic)\b`,
  String.raw`\b(?:overdose|took too (?:many|much)|kill myself|suicid\w*|end my life|want to die)\b`,
  String.raw`\b(?:dolor (?:de|en el) pecho|no puedo respirar|me desmay\w*|sangrado (?:abundante|que no para))\b`,
  String.raw`\b(?:seene (?:me|mein|mai) dard|chhati (?:me|mein) dard|saans (?:nahi|nahin|lene me|lene mein|phool)|behosh|khoon (?:nahi ruk|ruk nahi))`,
  'सीने में दर्द|छाती में दर्द|साँस (?:नहीं|लेने में)|सांस (?:नहीं|लेने में)|बेहोश|दौरा पड़|खून (?:नहीं रुक|रुक नहीं)',
  'ಎದೆ ನೋವು|ಉಸಿರಾಡಲು ಕಷ್ಟ|ಉಸಿರಾಟದ ತೊಂದರೆ|ಪ್ರಜ್ಞೆ ತಪ್ಪ|ಮೂರ್ಛೆ|ರಕ್ತಸ್ರಾವ ನಿಲ್ಲುತ್ತಿಲ್ಲ'
].join('|'), 'i');

const MED_CHANGE = /\b(?:double|two doses|extra (?:dose|tablet|pill)|take (?:more|less|another|an extra)|increase|decrease|reduce|lower|raise|halve|cut (?:it |the (?:pill|tablet) )?in half|skip(?:ping)? (?:a |my |the )?(?:dose|medicine|medication|pill|tablet|it)|stop(?:ping)? (?:taking|my|the|it)|quit (?:taking|my)|come off|missed (?:a |my )?dose|forgot (?:a |my |to take)|change (?:my |the )?dose)\b|\b(?:doguni|double kar|dugna|zyada (?:le|lu|loon)|band kar (?:du|doon|dein)|chhod (?:du|doon|dein))\b|\b(?:duplicar|doble dosis|dejar de tomar|saltar(?:me)? (?:la|una) dosis)\b|दोगुनी|डबल|ज़्यादा ले|ज्यादा ले|बंद कर दूँ|बंद कर दूं|छोड़ दूँ|छोड़ दूं|ಡಬಲ್|ನಿಲ್ಲಿಸ/i;
const PRESCRIBE = /\b(?:prescribe|recommend (?:a |some )?(?:medicine|medication|drug|pill|painkiller)|what (?:medicine|medication|pill|tablet|drug) (?:should|can|could) i take|give me (?:something|a medicine|medicine|a pill) for|suggest (?:a |some )?(?:medicine|medication|painkiller)|which painkiller)\b|\b(?:koi dawa (?:bata|de|likh)|dawai likh)\b|\b(?:recéteme|recetar|qué medicina (?:puedo|debo) tomar)\b|कोई दवा (?:बता|दे|लिख)|ದಯವಿಟ್ಟು ಔಷಧಿ ಕೊಡಿ/i;
const SKIP_VISIT = /\b(?:skip|miss|cancel|not go to|avoid) (?:my |the )?(?:follow[- ]?up|appointment|visit|check-?up)\b|\b(?:faltar a|cancelar) (?:la|mi) cita\b|(?:अपॉइंटमेंट|फ़ॉलो-अप|फॉलो-अप) (?:छोड़|रद्द)/i;
const SYMPTOM_Q = /\b(?:is (?:this|it|that) (?:symptom )?(?:dangerous|serious|normal|bad|an emergency)|should i (?:be )?worr(?:y|ied)|is (?:this|my) (?:pain|swelling|fever|bleeding|rash) (?:normal|ok|okay|dangerous))\b|\b(?:es peligroso|es grave|es normal)\b|खतरनाक|ख़तरनाक|गंभीर है|ಅಪಾಯಕಾರಿ/i;

const EMERGENCY = L(
  'This could be an emergency. Please call your local emergency number now (108 or 112 in India, 911 in the US) or go to the nearest emergency department. ClearCare cannot check symptoms or tell you whether something is dangerous.',
  'Esto podría ser una emergencia. Llame ahora a su número de emergencias local (911 en EE. UU., 112 en Europa) o vaya a la sala de urgencias más cercana. ClearCare no puede evaluar síntomas ni decir si algo es peligroso.',
  'यह आपात स्थिति हो सकती है। कृपया अभी अपने स्थानीय आपातकालीन नंबर पर कॉल करें (भारत में 108 या 112, अमेरिका में 911) या सबसे पास के इमरजेंसी विभाग में जाएँ। ClearCare लक्षणों की जाँच नहीं कर सकता और यह नहीं बता सकता कि कोई चीज़ ख़तरनाक है या नहीं।'
);
const MED_CHANGE_TEXT = L(
  'ClearCare can’t change how you take a medicine. Please don’t double, skip, stop or change a dose unless your care team tells you to. Call your care team or pharmacist.',
  'ClearCare no puede cambiar cómo toma un medicamento. No duplique, salte, suspenda ni cambie una dosis a menos que su equipo de atención se lo indique. Llame a su equipo o a su farmacéutico.',
  'ClearCare किसी दवा को लेने का तरीका नहीं बदल सकता। जब तक आपकी देखभाल टीम न कहे, खुराक दोगुनी न करें, न छोड़ें, न बंद करें, न बदलें। अपनी देखभाल टीम या फ़ार्मासिस्ट को फ़ोन करें।'
);
const PRESCRIBE_TEXT = L(
  'ClearCare can’t prescribe or recommend medicines. It only explains what your care team already wrote. Please ask your care team or pharmacist.',
  'ClearCare no puede recetar ni recomendar medicamentos. Solo explica lo que su equipo ya escribió. Pregunte a su equipo de atención o a su farmacéutico.',
  'ClearCare दवा लिख या सुझा नहीं सकता। यह सिर्फ़ वही समझाता है जो आपकी देखभाल टीम ने पहले से लिखा है। कृपया अपनी देखभाल टीम या फ़ार्मासिस्ट से पूछें।'
);
const SKIP_TEXT = L(
  'Please don’t skip or cancel a follow-up without talking to your care team. If you need to change it, call the clinic.',
  'No falte ni cancele una cita de control sin hablar con su equipo de atención. Si necesita cambiarla, llame a la clínica.',
  'अपनी देखभाल टीम से बात किए बिना फ़ॉलो-अप न छोड़ें और न रद्द करें। बदलना हो तो क्लिनिक को फ़ोन करें।'
);
const SYMPTOM_TEXT = L(
  'ClearCare can’t tell whether a symptom is dangerous. If it feels severe or sudden, call your local emergency number (108 or 112 in India, 911 in the US). Otherwise, please call your care team.',
  'ClearCare no puede decir si un síntoma es peligroso. Si es intenso o repentino, llame a su número de emergencias local (911 en EE. UU., 112 en Europa). Si no, llame a su equipo de atención.',
  'ClearCare यह नहीं बता सकता कि कोई लक्षण ख़तरनाक है या नहीं। अगर यह तेज़ या अचानक है, तो अपने स्थानीय आपातकालीन नंबर पर कॉल करें (भारत में 108 या 112)। वरना अपनी देखभाल टीम को फ़ोन करें।'
);
const PAPERS_SAY = L('Your papers say:', 'Sus papeles dicen:', 'आपके कागज़ों में लिखा है:');
const WARNING_SIGNS = L('Warning signs in your papers:', 'Señales de alarma en sus papeles:', 'आपके कागज़ों में लिखे चेतावनी संकेत:');

const quote = items => items.map(i => `“${i.provenance?.text || i.text}”`).join(' ');

/**
 * @returns null when the question is safe to answer normally, otherwise
 *          { kind: 'urgent'|'med_change'|'prescribe'|'skip_visit'|'symptom', answer, items }
 */
export function safetyGate(question, { plan = null, lang = 'en' } = {}) {
  const q = String(question || '');
  const items = plan?.items || [];
  const warnings = items.filter(i => i.category === 'warning');
  const named = items.filter(i => i.category === 'medication' && i.name && new RegExp(`\\b${i.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(q));
  const with_ = (text, extra, label = PAPERS_SAY) => (extra.length ? `${pick(text, lang)} ${pick(label, lang)} ${quote(extra)}` : pick(text, lang));
  if (URGENT.test(q)) return { kind: 'urgent', items: warnings, answer: with_(EMERGENCY, warnings.filter(w => w.severity === 'emergency').slice(0, 2), WARNING_SIGNS) };
  if (MED_CHANGE.test(q)) { const meds = named.length ? named : items.filter(i => i.category === 'medication').slice(0, 3); return { kind: 'med_change', items: meds, answer: with_(MED_CHANGE_TEXT, meds) }; }
  if (PRESCRIBE.test(q)) { const prn = items.filter(i => i.category === 'medication' && i.frequency?.prn); return { kind: 'prescribe', items: prn, answer: with_(PRESCRIBE_TEXT, prn) }; }
  if (SKIP_VISIT.test(q)) { const appts = items.filter(i => i.category === 'appointment' || i.category === 'test'); return { kind: 'skip_visit', items: appts, answer: with_(SKIP_TEXT, appts) }; }
  if (SYMPTOM_Q.test(q)) return { kind: 'symptom', items: warnings, answer: with_(SYMPTOM_TEXT, warnings.slice(0, 3), WARNING_SIGNS) };
  return null;
}
