// SpeechVerificationService: turns display text into speakable text WITHOUT changing meaning,
// then proves the numbers and negations survived. Transcript = display text; audio = this output.
import { normalizeLang } from '../i18n.js';
import { numbersIn } from '../clinical/fidelity.js';

const W = {
  point: { en: 'point', es: 'punto', hi: 'दशमलव' },
  zero: { en: 'zero', es: 'cero', hi: 'शून्य' },
  mg: { en: 'milligrams', es: 'miligramos', hi: 'मिलीग्राम' },
  mcg: { en: 'micrograms', es: 'microgramos', hi: 'माइक्रोग्राम' },
  mL: { en: 'milliliters', es: 'mililitros', hi: 'मिलीलीटर' },
  g: { en: 'grams', es: 'gramos', hi: 'ग्राम' },
  pct: { en: 'percent', es: 'por ciento', hi: 'प्रतिशत' }
};
const ABBR = { BID: { en: 'twice a day', es: 'dos veces al día', hi: 'दिन में दो बार' }, TID: { en: 'three times a day', es: 'tres veces al día', hi: 'दिन में तीन बार' }, QID: { en: 'four times a day', es: 'cuatro veces al día', hi: 'दिन में चार बार' }, PRN: { en: 'only when needed', es: 'solo cuando lo necesite', hi: 'सिर्फ़ ज़रूरत पड़ने पर' }, PO: { en: 'by mouth', es: 'por la boca', hi: 'मुँह से' }, INR: { en: 'I N R', es: 'I N R', hi: 'आई एन आर' } };

function speakDecimal(intPart, frac, lang) {
  const i = intPart === '' || intPart === '0' ? W.zero[lang] : intPart;
  return `${i} ${W.point[lang]} ${frac.split('').join(' ')}`;
}

export function toSpeech(text, lang = 'en') {
  lang = normalizeLang(lang);
  let s = String(text);
  s = s.replace(/(\d{1,3}),(?=\d{3}\b)/g, '$1');
  s = s.replace(/(?<![\w.])(\d*)\.(\d+)(?![\w.])/g, (_, a, b) => speakDecimal(a, b, lang));
  s = s.replace(/(\d)\s*mg\b/gi, `$1 ${W.mg[lang]}`).replace(/(\d)\s*(?:mcg|µg|μg)\b/gi, `$1 ${W.mcg[lang]}`).replace(/(\d)\s*ml\b/gi, `$1 ${W.mL[lang]}`).replace(/(\d)\s*g\b/g, `$1 ${W.g[lang]}`).replace(/(\d)\s*%/g, `$1 ${W.pct[lang]}`);
  // Units after spelled decimals ("zero point 5 mg").
  s = s.replace(/(\d)\s+mg\b/gi, `$1 ${W.mg[lang]}`);
  for (const [k, v] of Object.entries(ABBR)) s = s.replace(new RegExp(`\\b${k}\\b`, 'g'), v[lang]);
  s = s.replace(/[·•]/g, ', ').replace(/\s—\s|—/g, ', ').replace(/[“”"]/g, '').replace(/\s{2,}/g, ' ').trim();
  return s;
}

export function numbersFromSpeech(spoken, lang = 'en') {
  lang = normalizeLang(lang);
  const p = W.point[lang], z = W.zero[lang];
  const rebuilt = String(spoken).replace(new RegExp(`(${z}|\\d+)\\s+${p}\\s+(\\d(?:\\s\\d)*)`, 'g'), (_, a, b) => `${a === z ? '0' : a}.${b.replace(/\s/g, '')}`);
  return numbersIn(rebuilt.replace(new RegExp(`(^|\\s)${z}(?=\\s|$)`, 'g'), '$10'), 'en', { words: false });
}

const NEG = { en: /\b(?:not|never|avoid|stop|don't|no longer)\b|n't\b/gi, es: /\b(?:no|nunca|evite|deje de|sin)\b/gi, hi: /(?:^|\s)(?:न|नहीं|मत)(?=$|[\s,।.])|बंद/g };

export function verifySpeech(display, spoken, lang = 'en') {
  lang = normalizeLang(lang);
  const failures = [];
  const a = numbersIn(String(display).replace(/(\d{1,3}),(?=\d{3}\b)/g, '$1'), 'en', { words: false }).sort((x, y) => x - y);
  const b = numbersFromSpeech(spoken, lang).sort((x, y) => x - y);
  if (a.join('|') !== b.join('|')) failures.push({ code: 'number_mismatch', detail: `${a.join(',')} vs ${b.join(',')}` });
  const na = (String(display).match(NEG[lang]) || []).length, nb = (String(spoken).match(NEG[lang]) || []).length;
  if (nb < na) failures.push({ code: 'negation_lost', detail: `${na} vs ${nb}` });
  return { ok: !failures.length, failures };
}

export function speakable(display, lang) {
  const spoken = toSpeech(display, lang);
  const check = verifySpeech(display, spoken, lang);
  return check.ok ? { spoken, verified: true } : { spoken: display, verified: false, failures: check.failures };
}
