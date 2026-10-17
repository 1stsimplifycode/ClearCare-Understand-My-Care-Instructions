// Medication vocabulary and clinical abbreviation tables.
// High-alert list: union of the ORIGINAL ClearCare list and selected agents from the
// ISMP List of High-Alert Medications in Community/Ambulatory Care Settings (2021).
// This is a demo vocabulary, not a drug database. Unknown names are flagged, never guessed.

export const HIGH_RISK = new Set(['insulin glargine', 'insulin aspart', 'insulin lispro', 'insulin detemir', 'insulin degludec', 'diazepam', 'potassium chloride', 'amiodarone', 'clonazepam', 'alprazolam', 'zolpidem', 'insulin', 'warfarin', 'apixaban', 'rivaroxaban', 'dabigatran', 'heparin', 'enoxaparin', 'oxycodone', 'hydrocodone', 'morphine', 'fentanyl', 'tramadol', 'methadone', 'tacrolimus', 'cyclosporine', 'prednisone', 'methotrexate', 'digoxin', 'glipizide', 'glimepiride', 'glyburide']);

export const GENERICS = ['acetaminophen', 'paracetamol', 'ibuprofen', 'naproxen', 'aspirin', 'metoprolol', 'atenolol', 'carvedilol', 'amlodipine', 'lisinopril', 'losartan', 'telmisartan', 'furosemide', 'hydrochlorothiazide', 'spironolactone', 'atorvastatin', 'rosuvastatin', 'simvastatin', 'metformin', 'glipizide', 'glimepiride', 'glyburide', 'insulin', 'levothyroxine', 'amoxicillin', 'amoxicillin-clavulanate', 'azithromycin', 'cephalexin', 'cefuroxime', 'ciprofloxacin', 'levofloxacin', 'doxycycline', 'metronidazole', 'nitrofurantoin', 'warfarin', 'apixaban', 'rivaroxaban', 'dabigatran', 'heparin', 'enoxaparin', 'clopidogrel', 'ticagrelor', 'oxycodone', 'hydrocodone', 'morphine', 'fentanyl', 'tramadol', 'methadone', 'tacrolimus', 'cyclosporine', 'prednisone', 'prednisolone', 'dexamethasone', 'methotrexate', 'digoxin', 'pantoprazole', 'omeprazole', 'esomeprazole', 'ranitidine', 'famotidine', 'ondansetron', 'docusate', 'senna', 'lactulose', 'polyethylene glycol', 'gabapentin', 'pregabalin', 'sertraline', 'escitalopram', 'salbutamol', 'albuterol', 'montelukast', 'cetirizine', 'ramipril', 'bisoprolol', 'nebivolol', 'cilnidipine', 'torsemide', 'rabeprazole', 'domperidone', 'cefixime', 'cefpodoxime', 'linezolid', 'diclofenac', 'aceclofenac', 'vildagliptin', 'sitagliptin', 'gliclazide', 'levetiracetam', 'phenytoin', 'amiodarone', 'isosorbide mononitrate', 'nitroglycerin', 'budesonide', 'methylprednisolone', 'hydroxychloroquine', 'sucralfate', 'ursodeoxycholic acid', 'esomeprazole', 'clonazepam', 'alprazolam', 'zolpidem', 'loperamide', 'tamsulosin', 'finasteride', 'allopurinol', 'colchicine', 'febuxostat', 'folic acid', 'ferrous sulfate', 'insulin glargine', 'insulin aspart', 'insulin lispro', 'insulin detemir', 'insulin degludec', 'potassium chloride', 'tranexamic acid', 'tenofovir', 'timolol', 'salmeterol', 'formoterol', 'cholecalciferol', 'vitamin d3', 'vitamin b12', 'cyanocobalamin', 'methylcobalamin', 'calcium carbonate', 'calcium', 'alendronate', 'diazepam', 'co-amoxiclav', 'co-codamol', 'ipratropium', 'tiotropium', 'fluticasone', 'mirtazapine', 'quetiapine', 'haloperidol'];

export const BRANDS = { tylenol: 'acetaminophen', crocin: 'paracetamol', dolo: 'paracetamol', calpol: 'paracetamol', advil: 'ibuprofen', motrin: 'ibuprofen', brufen: 'ibuprofen', ecosprin: 'aspirin', coumadin: 'warfarin', eliquis: 'apixaban', xarelto: 'rivaroxaban', pradaxa: 'dabigatran', lovenox: 'enoxaparin', plavix: 'clopidogrel', lasix: 'furosemide', lipitor: 'atorvastatin', glucophage: 'metformin', synthroid: 'levothyroxine', thyronorm: 'levothyroxine', augmentin: 'amoxicillin-clavulanate', zithromax: 'azithromycin', keflex: 'cephalexin', cipro: 'ciprofloxacin', zofran: 'ondansetron', colace: 'docusate', protonix: 'pantoprazole', pan: 'pantoprazole', lantus: 'insulin glargine', basaglar: 'insulin glargine', novorapid: 'insulin aspart', humalog: 'insulin lispro', 'co-amoxiclav': 'amoxicillin-clavulanate' };

export const NUMBER_WORDS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fourteen: 14, fifteen: 15, twenty: 20, thirty: 30, half: 0.5 };
export const NUMWORD_RX = Object.keys(NUMBER_WORDS).join('|');

// Abbreviations → meaning. `errorProne` follows the ISMP List of Error-Prone Abbreviations (2021).
export const ABBREVIATIONS = [
  { rx: /\bb\.?i\.?d\.?\b/i, key: 'BID', meaning: { en: 'twice a day', es: 'dos veces al día', hi: 'दिन में दो बार' } },
  { rx: /\bt\.?i\.?d\.?\b/i, key: 'TID', meaning: { en: 'three times a day', es: 'tres veces al día', hi: 'दिन में तीन बार' } },
  { rx: /\bq\.?i\.?d\.?\b/i, key: 'QID', meaning: { en: 'four times a day', es: 'cuatro veces al día', hi: 'दिन में चार बार' } },
  { rx: /\bq\.?d\.?\b/i, key: 'QD', meaning: { en: 'once a day', es: 'una vez al día', hi: 'दिन में एक बार' }, errorProne: true },
  { rx: /\bOD\b/, key: 'OD', meaning: { en: 'once a day (can also mean "right eye")', es: 'una vez al día (también puede significar "ojo derecho")', hi: 'दिन में एक बार (इसका मतलब "दाईं आँख" भी हो सकता है)' }, errorProne: true },
  { rx: /\bq\.?h\.?s\.?\b|\bH\.?S\.?\b/, key: 'HS', meaning: { en: 'at bedtime', es: 'al acostarse', hi: 'सोने से पहले' }, errorProne: true },
  { rx: /\bp\.?r\.?n\.?\b|\bSOS\b/i, key: 'PRN', meaning: { en: 'only when needed', es: 'solo cuando lo necesite', hi: 'सिर्फ़ ज़रूरत पड़ने पर' } },
  { rx: /\bPC\b|\bp\.c\.(?=\s|$)/, key: 'PC', meaning: { en: 'after meals', es: 'después de las comidas', hi: 'खाने के बाद' } },
  { rx: /\bAC\b|\ba\.c\.(?=\s|$)/, key: 'AC', meaning: { en: 'before meals', es: 'antes de las comidas', hi: 'खाने से पहले' } },
  { rx: /\bp\.?o\.?\b(?=\s|$|[,;.])/i, key: 'PO', meaning: { en: 'by mouth', es: 'por la boca', hi: 'मुँह से' } },
  { rx: /\b(?:SC|SQ|s\.c\.)\b/, key: 'SC', meaning: { en: 'injected under the skin', es: 'inyectado bajo la piel', hi: 'त्वचा के नीचे इंजेक्शन' }, errorProne: true },
  { rx: /\bIM\b/, key: 'IM', meaning: { en: 'injected into a muscle', es: 'inyectado en un músculo', hi: 'मांसपेशी में इंजेक्शन' } },
  { rx: /\bIV\b/, key: 'IV', meaning: { en: 'into a vein', es: 'en una vena', hi: 'नस में' } },
  { rx: /\bSL\b/, key: 'SL', meaning: { en: 'under the tongue', es: 'debajo de la lengua', hi: 'जीभ के नीचे' } },
  { rx: /\bq\.?(\d{1,2})\.?h\b/i, key: 'qNh', meaning: null },
  { rx: /\bINR\b/, key: 'INR', meaning: { en: 'a blood test that checks how quickly your blood clots', es: 'un análisis de sangre que mide qué tan rápido coagula la sangre', hi: 'खून का एक टेस्ट जो देखता है कि खून कितनी जल्दी जमता है' } }
];

export const GLOSSARY = {
  incision: { en: 'the cut made during surgery', es: 'el corte que se hizo durante la cirugía', hi: 'सर्जरी के दौरान लगाया गया चीरा' },
  'blood thinner': { en: 'a medicine that makes blood clot more slowly', es: 'un medicamento que hace que la sangre coagule más despacio', hi: 'ऐसी दवा जिससे खून धीरे जमता है' },
  anticoagulant: { en: 'a blood thinner: a medicine that makes blood clot more slowly', es: 'un anticoagulante: hace que la sangre coagule más despacio', hi: 'खून पतला करने वाली दवा' },
  'as tolerated': { en: 'as much as you comfortably can', es: 'tanto como pueda hacerlo cómodamente', hi: 'जितना आप आराम से कर सकें' },
  'follow up': { en: 'a later visit to check how you are recovering', es: 'una visita posterior para revisar su recuperación', hi: 'बाद में होने वाली जाँच, यह देखने के लिए कि आप कैसे ठीक हो रहे हैं' },
  'follow-up': { en: 'a later visit to check how you are recovering', es: 'una visita posterior para revisar su recuperación', hi: 'बाद में होने वाली जाँच, यह देखने के लिए कि आप कैसे ठीक हो रहे हैं' },
  dose: { en: 'how much medicine to take at one time', es: 'cuánto medicamento tomar cada vez', hi: 'एक बार में कितनी दवा लेनी है' },
  endocrinology: { en: 'the clinic for hormone conditions such as diabetes', es: 'la consulta de hormonas, como la diabetes', hi: 'हार्मोन से जुड़ी बीमारियों (जैसे डायबिटीज़) का क्लिनिक' },
  laparoscopic: { en: 'surgery done through small cuts using a camera', es: 'cirugía hecha con cortes pequeños y una cámara', hi: 'छोटे चीरों और कैमरे से की गई सर्जरी' },
  inr: { en: 'a blood test that checks how quickly your blood clots', es: 'un análisis que mide qué tan rápido coagula la sangre', hi: 'खून जमने की गति जाँचने का टेस्ट' }
};
