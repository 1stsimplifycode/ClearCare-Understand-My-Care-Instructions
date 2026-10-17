// ClinicalExtractionProvider (deterministic, rule-based). Isomorphic: runs in browser and Node.
// Every item keeps its original text and page provenance. Anything uncertain is marked
// needs_clarification and can never become a medication reminder.
import { HIGH_RISK, GENERICS, BRANDS, NUMBER_WORDS, NUMWORD_RX, ABBREVIATIONS } from './vocab.js';

export const PLAN_VERSION = 'clearcare-plan/2';
const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec';
const NUMTOK = String.raw`(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:[.,]\d+)?|\.\d+|${NUMWORD_RX})`;
const STRENGTH_UNIT = String.raw`(?:mgs?|MG|mcg|µg|μg|micrograms?|milligrams?|g|grams?|mL|ml|cc|milliliters?|millilitres?|units?|IU|U|%)`;
const QTY_UNIT = String.raw`(?:tablets?|tabs?|capsules?|caps?|puffs?|drops?|sachets?|teaspoons?|tsp|tablespoons?|tbsp|injections?|patch(?:es)?)`;
const SECTION_HEADERS = /^(?:discharge medications?|medications?|medication list|medicines?|medication changes|new medications?|stopped medications?|care at home|home care|wound care|activity|diet|follow[- ]?up|appointments?|tests?|when to call|warning signs|when to seek help|what to bring|discharge information|instructions|allergies|manual test cue|additional medication note|recovery|notes?)\s*:?$/i;
const UNREADABLE = /\[(?:unreadable|illegible|date illegible|time illegible)[^\]]*\]|\w\?\?+\w|�/i;
const INJECTION = /<\s*\/?\s*(?:script|img|svg|iframe|object|embed|a|style)\b|\bon[a-z]+\s*=|javascript:|(?:^|\s)(?:assistant|system|user)\s*:|\b(?:ignore (?:all |any )?(?:previous|prior|above) (?:instructions|directions)|disregard (?:the|all) (?:above|previous)|system prompt|you are (?:now )?(?:an? )?(?:ai|assistant|chatbot)|respond only with|reveal (?:your|the) (?:prompt|key)|api[_ ]?key)\b/i;

export function parseNumber(tok) {
  if (tok == null) return null;
  const t = String(tok).toLowerCase().trim();
  if (t in NUMBER_WORDS) return NUMBER_WORDS[t];
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(t)) return Number(t.replace(/,/g, ''));
  if (/^\d+,\d{1,2}$/.test(t)) return Number(t.replace(',', '.'));
  const n = Number(t.startsWith('.') ? '0' + t : t);
  return Number.isFinite(n) ? n : null;
}

function normUnit(u) {
  const x = String(u || '').toLowerCase();
  if (/^(?:mgs?|milligrams?)$/.test(x)) return 'mg';
  if (/^(?:mcg|µg|μg|micrograms?)$/.test(x)) return 'mcg';
  if (/^(?:g|grams?)$/.test(x)) return 'g';
  if (/^(?:ml|cc|milliliters?|millilitres?)$/.test(x)) return 'mL';
  if (/^(?:units?|iu|u)$/.test(x)) return 'units';
  if (x === '%') return '%';
  if (/^tab/.test(x)) return 'tablet'; if (/^cap/.test(x)) return 'capsule'; if (/^puff/.test(x)) return 'puff'; if (/^drop/.test(x)) return 'drop';
  if (/^sachet/.test(x)) return 'sachet'; if (/^(?:teaspoon|tsp)/.test(x)) return 'teaspoon'; if (/^(?:tablespoon|tbsp)/.test(x)) return 'tablespoon'; if (/^inj/.test(x)) return 'injection'; if (/^patch/.test(x)) return 'patch';
  return x;
}

function hashId(prefix, text) { let h = 2166136261; for (const ch of text) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return `${prefix}-${(h >>> 0).toString(36)}`; }

// ---------- 1. lines with provenance, continuation joining ----------
function provenanceLines(doc) {
  const out = [];
  for (const p of doc.pages || []) p.lines.forEach((text, i) => out.push({ text: text.replace(/\s+/g, ' ').trim(), page: p.page, line: i + 1 }));
  return out.filter(l => l.text);
}

function joinContinuations(lines) {
  const joined = [];
  for (const l of lines) {
    const prev = joined.at(-1);
    const startsCont = /^[a-z:;,)]/.test(l.text) || /^(?:in \d+ hours?|avenue|street|road|lane|suite|nagar|marg)\b/i.test(l.text);
    const prevOpen = prev && !/[.!?:]$/.test(prev.text) && !SECTION_HEADERS.test(prev.text);
    if (prev && prev.page === l.page && (startsCont || (prevOpen && /^(?:Avenue|Street|Road|Suite)\b/.test(l.text)))) {
      prev.text = `${prev.text}${/^[:;,)]/.test(l.text) ? '' : ' '}${l.text}`; prev.lineEnd = l.line;
    } else joined.push({ text: l.text, page: l.page, lineStart: l.line, lineEnd: l.line });
  }
  return joined;
}

export function splitSentences(text) {
  const protectedText = text.replace(/\b(Dr|Mr|Mrs|Ms|St|No|vs|approx|e\.g|i\.e|a\.m|p\.m|b\.i\.d|t\.i\.d|q\.i\.d|p\.r\.n|p\.o|p\.c|a\.c|q\.d|h\.s)\./gi, m => m.replace(/\./g, '․'));
  return protectedText.split(/(?<=[.!?>])\s+(?=[A-Z0-9\[("'<])/).map(s => s.replace(/․/g, '.').trim()).filter(Boolean);
}

// ---------- 2. medication name recognition ----------
const NAME_RX = new RegExp(`\\b(${[...GENERICS, ...Object.keys(BRANDS)].sort((a, b) => b.length - a.length).map(n => n.replace(/[-\s]/g, '[-\\s]')).join('|')})\\b(?!-[A-Za-z])`, 'gi');
const UNKNOWN_MED_RX = new RegExp(`\\b(?:take|start|continue|stop|hold|resume|give|inject|apply|use)\\s+(?:the\\s+)?([A-Z][a-z]{3,}(?:-[A-Z]?[a-z]+)?)\\s+${NUMTOK}\\s*${STRENGTH_UNIT}\\b|\\b([A-Z][a-z]{3,})\\s+${NUMTOK}\\s*(?:mg|mcg|µg|μg|mL|units|IU)\\b`, 'g');
const NOT_DRUG = new Set(['take', 'start', 'continue', 'stop', 'hold', 'resume', 'give', 'inject', 'apply', 'use', 'exceed', 'about', 'only', 'total', 'than', 'dose', 'daily', 'maximum', 'more', 'less', 'over', 'under', 'with', 'each', 'every', 'note', 'later', 'then', 'after', 'before', 'take', 'tablet', 'tablets', 'capsule', 'capsules', 'unit', 'units', 'medicine', 'medication', 'medica']);

function medNamesIn(text) {
  const names = [];
  const comboSpans = [];
  for (const m of text.matchAll(NAME_RX)) {
    if (comboSpans.some(([a, b]) => m.index >= a && m.index < b)) continue;
    const combo = text.slice(m.index + m[1].length).match(/^\s*\/\s*([A-Za-z][A-Za-z-]+)/);
    if (combo) { comboSpans.push([m.index, m.index + m[1].length + combo[0].length]); names.push({ raw: m[1] + combo[0].replace(/\s+/g, ''), generic: m[1].toLowerCase() + '/' + combo[1].toLowerCase(), recognized: true, brand: null, index: m.index, end: m.index + m[1].length + combo[0].length }); continue; } const raw = m[1].toLowerCase().replace(/\s+/g, ' '); const generic = BRANDS[raw] || raw.replace(' ', '-'); names.push({ raw: m[1], generic: GENERICS.includes(generic) ? generic : (GENERICS.find(g => g.replace(/[-\s]/g, '') === generic.replace(/[-\s]/g, '')) || generic), recognized: true, brand: BRANDS[raw] ? m[1] : null, index: m.index, end: m.index + m[1].length }); }
  for (const m of text.matchAll(UNKNOWN_MED_RX)) { const w = m[1] || m[2]; if (!w || NOT_DRUG.has(w.toLowerCase()) || names.some(n => n.raw.toLowerCase() === w.toLowerCase())) continue; if (new RegExp(`^(?:${MONTHS})$`, 'i').test(w)) continue; const wi = text.indexOf(w, m.index); names.push({ raw: w, generic: w.toLowerCase(), recognized: false, brand: null, index: wi, end: wi + w.length }); }
  return names.sort((a, b) => a.index - b.index);
}

// ---------- 3. field parsers ----------
function stripTemporal(s) {
  // Remove spans whose numbers are NOT doses: dates, times, phones, intervals, durations, counts, limits.
  return s
    .replace(/\((?:previously|formerly|was|old dose|earlier)[^)]*\)/gi, ' ⟨previous⟩ ')
    .replace(new RegExp(`\\b(?:previously|formerly|instead of|rather than|from)\\s+${NUMTOK}\\s*${STRENGTH_UNIT}\\b`, 'gi'), ' ⟨previous⟩ ')
    .replace(/\b[0-2½](?:\s*-\s*[0-2½]){2}\b/g, ' ⟨pattern⟩ ')
    .replace(new RegExp(`\\b(?:${MONTHS})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?(?:\\s+\\d{4})?\\b`, 'gi'), ' ⟨date⟩ ')
    .replace(new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTHS})\\.?,?(?:\\s+\\d{4})?\\b`, 'gi'), ' ⟨date⟩ ')
    .replace(/\b\d{1,4}[/-]\d{1,2}[/-]\d{2,4}\b/g, ' ⟨date⟩ ')
    .replace(/\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)(?=\W|$)/gi, ' ⟨time⟩ ').replace(/\b\d{1,2}:\d{2}\b/g, ' ⟨time⟩ ')
    .replace(/\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]\d{4}\b|\b\d{10,}\b/g, ' ⟨phone⟩ ')
    .replace(new RegExp(`\\b(?:do not|don't|never)\\s+(?:exceed|take more than|go over)\\s+${NUMTOK}\\s*${STRENGTH_UNIT}?[^.;]*`, 'gi'), ' ⟨limit⟩ ')
    .replace(new RegExp(`\\b(?:maximum|max\\.?|no more than|not more than|up to)\\s+(?:of\\s+)?${NUMTOK}\\s*(?:${STRENGTH_UNIT}|doses?|tablets?|capsules?|times)?\\s*(?:(?:\\/|in|per|a|every)\\s*(?:24 hours|day))?`, 'gi'), ' ⟨limit⟩ ')
    .replace(/\bx\s*\d+\s*(?:d|days?|w|wks?|weeks?)\b/gi, ' ⟨duration⟩ ')
    .replace(new RegExp(`\\b(?:every|each|q\\.?)\\s*${NUMTOK}\\s*(?:-|to)?\\s*(?:${NUMTOK}\\s*)?(?:hours?|hrs?|h|days?|weeks?)\\b`, 'gi'), ' ⟨interval⟩ ')
    .replace(/\bq\.?\d{1,2}\.?h\b/gi, ' ⟨interval⟩ ')
    .replace(new RegExp(`\\b(?:for|after|in|within|over|x|×|until day|on day|from day|by day)\\s+(?:the\\s+next\\s+|another\\s+)?${NUMTOK}\\s*(?:more\\s+)?(?:days?|weeks?|months?|hours?|hrs?|doses?)\\b`, 'gi'), ' ⟨duration⟩ ')
    .replace(new RegExp(`\\b${NUMTOK}\\s*(?:days?|weeks?|months?|hours?|hrs?|minutes?|mins?)\\b`, 'gi'), ' ⟨duration⟩ ')
    .replace(new RegExp(`\\b${NUMTOK}\\s+times\\b`, 'gi'), ' ⟨count⟩ ')
    .replace(new RegExp(`\\b(?:above|below|over|under|greater than|less than|more than|>|<|≥|≤)\\s*${NUMTOK}\\b(?!\\s*${STRENGTH_UNIT})`, 'gi'), ' ⟨threshold⟩ ')
    .replace(new RegExp(`(?:\\b\\d+\\s*\\/\\s*\\d+|½|\\b${NUMTOK}(?:\\s*(?:-|–|to|or)\\s*${NUMTOK})?)\\s*${QTY_UNIT}\\b`, 'gi'), m => ` ⟨qty:${m.trim()}⟩ `);
}

function strengthsIn(sentence, names) {
  let masked = stripTemporal(sentence);
  const found = [];
  for (const m of masked.matchAll(new RegExp(`(?<![\\w.])(${NUMTOK})\\s*(?:-|–|to)\\s*(${NUMTOK})\\s*(${STRENGTH_UNIT})(?![\\w])`, 'gi'))) {
    found.push({ value: null, range: [parseNumber(m[1]), parseNumber(m[2])], unit: normUnit(m[3]), raw: m[0].trim(), index: m.index, unitMissing: false });
    masked = masked.slice(0, m.index) + ' '.repeat(m[0].length) + masked.slice(m.index + m[0].length);
  }
  for (const m of masked.matchAll(new RegExp(`(?<![\\w.])(${NUMTOK})\\s*(${STRENGTH_UNIT})(?![\\w])`, 'gi'))) {
    if (/^[a-z]+$/i.test(m[1]) && m[1].toLowerCase() !== 'half') continue; // word numbers rarely carry a strength
    found.push({ value: parseNumber(m[1]), unit: normUnit(m[2]), raw: m[0].trim(), index: m.index, unitMissing: false, errorProneU: m[2] === 'U' });
  }
  for (const n of names) {
    const rx = new RegExp(`\\b${n.raw.replace(/[-\s]/g, '[-\\s]')}\\b\\s*[:\\-]?\\s*(${NUMTOK})(?!\\s*(?:${STRENGTH_UNIT}|${QTY_UNIT})\\b)(?!\\s*[-–\\/])(?=\\s|$|[,.;:)])`, 'i');
    const m = masked.match(rx);
    if (m && !/^[a-z]+$/i.test(m[1]) && !found.some(f => Math.abs(f.index - m.index) < m[0].length + 2)) found.push({ value: parseNumber(m[1]), unit: null, raw: m[1], index: m.index, unitMissing: true });
  }
  return found.sort((a, b) => a.index - b.index);
}

function quantityIn(sentence) {
  const fr = sentence.match(new RegExp(`\\b(\\d+)\\s*\\/\\s*(\\d+)\\s+(${QTY_UNIT})\\b|½\\s*(${QTY_UNIT})|\\bhalf(?:\\s+an?|\\s+of\\s+an?)?\\s+(${QTY_UNIT})\\b`, 'i'));
  if (fr) { if (fr[1]) return { value: Number(fr[1]) / Number(fr[2]), unit: normUnit(fr[3]), raw: fr[0], fraction: `${fr[1]}/${fr[2]}` }; return { value: 0.5, unit: normUnit(fr[4] || fr[5]), raw: fr[0], fraction: '1/2' }; }
  const rg = sentence.match(new RegExp(`\\b(${NUMTOK})\\s*(?:-|–|to|or)\\s*(${NUMTOK})\\s+(${QTY_UNIT})\\b`, 'i'));
  if (rg) return { value: null, range: [parseNumber(rg[1]), parseNumber(rg[2])], unit: normUnit(rg[3]), raw: rg[0] };
  const m = sentence.match(new RegExp(`\\b(${NUMTOK}|a|an|one-half|one half)\\s+(${QTY_UNIT})\\b`, 'i'));
  if (!m) return null;
  const word = m[1].toLowerCase();
  const value = word === 'a' || word === 'an' ? 1 : /half/.test(word) ? 0.5 : parseNumber(word);
  return value == null ? null : { value, unit: normUnit(m[2]), raw: m[0] };
}

const CLAUSE_NEG = /\b(?:not|never|don't|dont|avoid|instead of|rather than|previously|formerly|no longer|shouldn't|mustn't)\b/i;
function negatedAt(t, idx) {
  const clause = t.slice(Math.max(0, idx - 60), idx).split(/[.;:,—–]|\bbut\b|\band\b/i).pop().replace(/\b(?:do not|don't|never)\s+(?:forget|miss|stop|skip)\b/gi, ' ');
  if (!CLAUSE_NEG.test(clause)) return false;
  return /\b(?:more than|exceed|over)\b/i.test(clause) ? 'limit' : true;
}
const FREQ_PATTERNS = [
  [/\b(?:b\.?i\.?d\.?|twice (?:a |per |each |every )?day|twice daily|two times (?:a |per |each )?day|2 times (?:a |per |each )?day|2x\/day|two times daily|2 times daily)\b/gi, m => ({ tpd: 2 })],
  [/\b(?:t\.?i\.?d\.?|three times (?:a |per |each )?day|three times daily|3 times (?:a |per |each )?day|3 times daily)\b/gi, m => ({ tpd: 3 })],
  [/\b(?:q\.?i\.?d\.?|four times (?:a |per |each )?day|four times daily|4 times (?:a |per |each )?day|4 times daily)\b/gi, m => ({ tpd: 4 })],
  [/\bBD\b|\bB\.D\./g, m => ({ tpd: 2 })],
  [/\bTDS\b|\bTID\b|\bT\.D\.S\./g, m => ({ tpd: 3 })],
  [/\bQDS\b|\bQID\b/g, m => ({ tpd: 4 })],
  [new RegExp(`\\b(?:every|each|q\\.?)\\s*(${NUMTOK})\\s*(?:-|–|to)\\s*(${NUMTOK})\\s*(?:hours?|hrs?|h)\\b`, 'gi'), m => ({ everyHoursRange: [parseNumber(m[1]), parseNumber(m[2])] })],
  [/\b(?:once (?:a|per|every) month|monthly|every month)\b/gi, m => ({ perMonth: 1 })],
  [new RegExp(`\\b(?:every|each)\\s+(${NUMTOK})\\s*(?:hours?|hrs?)\\b|\\bq\\.?(\\d{1,2})\\.?h\\b`, 'gi'), m => { const h = parseNumber(m[1] || m[2]); return { everyHours: h, tpd: h && 24 % h === 0 ? 24 / h : null }; }],
  [/\b([0-2½])\s*-\s*([0-2½])\s*-\s*([0-2½])\b/g, m => { const v = [m[1], m[2], m[3]].map(x => (x === '½' ? 0.5 : Number(x))); const slots = ['morning', 'afternoon', 'bedtime'].filter((_, i) => v[i] > 0); return { tpd: slots.length, timing: slots, pattern: m[0], perSlot: v }; }],
  [/\b(?:every other day|alternate days?|on alternate days)\b/gi, m => ({ everyOtherDay: true })],
  [/\b(?:once (?:a |per |each |every )?day|once daily|daily|every day|each day|per day)\b/gi, m => ({ tpd: 1 })],
  [/\b[qQ]\.?[dD]\.?(?=\W|$)|\bOD\b/g, m => ({ tpd: 1, errorProne: m[0].replace(/\./g, '').toUpperCase() })],
  [/\b(?:q\.?h\.?s\.?|H\.?S\.?)\b/g, m => ({ timingOnly: 'bedtime', errorProne: 'HS' })],
  [/\b(?:every|each) (morning|evening|night)\b|\b(?:at bedtime|nightly|at night|in the morning|in the evening|in the afternoon)\b/gi, m => ({ timingOnly: /morning/i.test(m[0]) ? 'morning' : /afternoon/i.test(m[0]) ? 'afternoon' : /evening/i.test(m[0]) ? 'evening' : 'bedtime' })],
  [/\b(?:once (?:a|per|every) week|weekly|every week)\b/gi, m => ({ perWeek: 1 })]
];
export function parseFrequency(text) {
  const t = text;
  const f = { timesPerDay: null, everyHours: null, everyHoursRange: null, perWeek: null, perMonth: null, everyOtherDay: false, prn: false, prnReason: null, timing: [], raw: [], errorProne: [], conflict: false, negated: false, fromTiming: false };
  let work = t;
  const explicit = [], timingOnly = new Set();
  for (const [rx, fn] of FREQ_PATTERNS) {
    for (const m of work.matchAll(rx)) {
      const neg = negatedAt(t, m.index);
      work = work.slice(0, m.index) + ' '.repeat(m[0].length) + work.slice(m.index + m[0].length);
      if (neg) { if (neg !== 'limit') f.negated = true; continue; }
      const r = fn(m); f.raw.push(m[0]);
      if (r.errorProne) f.errorProne.push(r.errorProne);
      if (r.everyOtherDay) f.everyOtherDay = true;
      if (r.perWeek) f.perWeek = r.perWeek;
      if (r.perMonth) f.perMonth = r.perMonth;
      if (r.everyHoursRange) { f.everyHoursRange = r.everyHoursRange; continue; }
      if (r.timingOnly) { timingOnly.add(r.timingOnly); continue; }
      if (r.timing) for (const k of r.timing) if (!f.timing.includes(k)) f.timing.push(k);
      if (r.pattern) f.pattern = r.pattern;
      if (r.tpd != null || r.everyHours != null) explicit.push(r);
    }
  }
  const tpds = [...new Set(explicit.map(e => e.tpd).filter(v => v != null))];
  if (tpds.length > 1 || (f.everyOtherDay && tpds.length)) f.conflict = true;
  if (explicit.length) { f.timesPerDay = tpds.length === 1 ? tpds[0] : explicit[0].tpd ?? null; f.everyHours = explicit.find(e => e.everyHours)?.everyHours ?? null; }
  else if (timingOnly.size) { f.timesPerDay = timingOnly.size; f.fromTiming = true; }
  for (const k of timingOnly) if (!f.timing.includes(k)) f.timing.push(k);
  const prnRx = /\b(?:as needed|as required|when needed|if needed|when required|p\.?r\.?n\.?|SOS)\b/i;
  const pm = t.match(prnRx);
  if (pm && !negatedAt(t, pm.index)) {
    f.prn = true; f.raw.push(pm[0]);
    const r = t.match(/\b(?:as needed|as required|when needed|if needed|p\.?r\.?n\.?|SOS)\s+(?:for\s+)?([a-z][a-z ]{2,30}?)(?=[.;,]|\s+(?:do|and|but|up|not|max)\b|$)/i);
    if (r && !/^(?:up|more|the|a)$/i.test(r[1].trim())) f.prnReason = r[1].trim();
  }
  const timings = [[/\b(?:before (?:meals|food|eating)|AC)\b/g, 'beforeMeals'], [/\b(?:after (?:meals|food|eating)|PC\b|p\.c\.)/g, 'afterMeals'], [/\bwith (?:meals|food)\b/gi, 'withMeals'], [/\bbefore breakfast\b/gi, 'beforeBreakfast'], [/\bbefore dinner\b/gi, 'beforeDinner'], [/\b(?:before bed)\b/gi, 'bedtime'], [/\bon an empty stomach\b/gi, 'emptyStomach']];
  const off = t.match(new RegExp(`\\b(${NUMTOK})\\s*(minutes?|mins?|hours?|hrs?)\\s+(before|after)\\s+(breakfast|meals?|food|dinner|lunch|eating)\\b`, 'i'));
  if (off && !negatedAt(t, off.index)) f.offset = { value: parseNumber(off[1]), unit: /^h/i.test(off[2]) ? 'hour' : 'minute', rel: off[3].toLowerCase(), meal: off[4].toLowerCase().replace(/^meal$/, 'meals').replace(/^eating$/, 'food') };
  for (const [rx, key] of timings) for (const m of t.matchAll(rx)) { if (negatedAt(t, m.index)) continue; if (f.offset && /^(?:before|after)/i.test(m[0])) continue; if (!f.timing.includes(key)) f.timing.push(key); }
  return f;
}

function parseRoute(t) {
  if (/\b(?:by mouth|orally|oral|p\.?o\.?)(?=\W|$)/i.test(t)) return 'oral';
  if (/\b(?:under the skin|subcutaneous(?:ly)?|SC|SQ)\b/.test(t)) return 'subcutaneous';
  if (/\b(?:inhale|inhaler|puffs?)\b/i.test(t)) return 'inhaled';
  if (/\b(?:apply|topical|on the skin|cream|ointment)\b/i.test(t)) return 'topical';
  if (/\b(?:under the tongue|sublingual|SL)\b/.test(t)) return 'sublingual';
  if (/\b(?:IV|intravenous)\b/.test(t)) return 'intravenous';
  if (/\b(?:IM|intramuscular)\b/.test(t)) return 'intramuscular';
  return null;
}

function parseDuration(t) {
  const m = t.match(new RegExp(`\\b(?:for|x|×)\\s*(?:the\\s+next\\s+|another\\s+)?(${NUMTOK})\\s*(?:more\\s+)?(days?|d|weeks?|wks?|w|months?|hours?|hrs?)\\b`, 'i'));
  const until = t.match(/\buntil\s+([^.;]+?)(?=[.;]|$)/i);
  const unit = m ? m[2].toLowerCase() : null;
  const norm = !unit ? null : /^d/.test(unit) ? 'day' : /^w/.test(unit) ? 'week' : /^mo/.test(unit) ? 'month' : 'hour';
  return { value: m ? parseNumber(m[1]) : null, unit: norm, raw: m?.[0] || null, until: until ? until[1].trim() : null };
}

function parseStart(t) {
  const after = t.match(new RegExp(`\\b(?:start|begin|resume|restart)[^.;]*?\\bafter\\s+(${NUMTOK})\\s*(days?|weeks?)\\b|\\bafter\\s+(${NUMTOK})\\s*(days?|weeks?)\\b[^.;]*?\\b(?:start|begin|resume|restart)`, 'i'));
  if (after) return { delay: { value: parseNumber(after[1] || after[3]), unit: (after[2] || after[4]).toLowerCase().replace(/s$/, '') }, date: null, raw: after[0] };
  const date = parseDate(t.match(/\b(?:starting|start(?:ing)? on|from|beginning|on)\s+([^.;]+)/i)?.[1] || '');
  if (date.iso && /\b(?:starting|start|from|beginning)\b/i.test(t)) return { delay: null, date: date.iso, raw: date.raw };
  if (/\b(?:start(?:ing)?|begin(?:ning)?)\s+(?:today|tonight)\b/i.test(t)) return { delay: { value: 0, unit: 'day' }, date: null, raw: 'today' };
  if (/\b(?:start(?:ing)?|begin(?:ning)?|resume|restart)\b[^.;]*\btomorrow\b|\btomorrow\b[^.;]*\b(?:start|begin|resume|restart)/i.test(t)) return { delay: { value: 1, unit: 'day' }, date: null, raw: 'tomorrow' };
  const wd = t.match(/\b(?:start(?:ing)?|begin(?:ning)?|resume|restart)\b[^.;]*\b(?:on\s+)?((?:mon|tues|wednes|thurs|fri|satur|sun)day)\b/i);
  if (wd) return { delay: { value: null, unit: 'weekday' }, date: null, raw: wd[1] };
  return null;
}

export function parseDate(text) {
  const mi = m => new Date(`${m} 1, 2000`).getMonth() + 1;
  let m = text.match(new RegExp(`\\b(${MONTHS})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, 'i'));
  if (m) return { iso: `${m[3]}-${String(mi(m[1].slice(0, 3))).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`, raw: m[0], ambiguous: false };
  m = text.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS})\\.?,?\\s+(\\d{4})\\b`, 'i'));
  if (m) return { iso: `${m[3]}-${String(mi(m[2].slice(0, 3))).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`, raw: m[0], ambiguous: false };
  m = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) return { iso: m[0], raw: m[0], ambiguous: false };
  m = text.match(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/);
  if (m) { const a = Number(m[1]), b = Number(m[2]); if (a > 12 && b <= 12) return { iso: `${m[3]}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`, raw: m[0], ambiguous: false }; if (b > 12 && a <= 12) return { iso: `${m[3]}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`, raw: m[0], ambiguous: false }; return { iso: null, raw: m[0], ambiguous: true }; }
  m = text.match(new RegExp(`\\b(${MONTHS})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?!,?\\s*\\d{4})`, 'i'));
  if (m) return { iso: null, raw: m[0], ambiguous: true, yearMissing: true };
  return { iso: null, raw: null, ambiguous: false };
}

function parseTime(text) {
  const m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?=\W|$)/i) || text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b(?!\s*(?:a\.?m|p\.?m))/i);
  if (!m) return null;
  let h = Number(m[1]); const min = Number(m[2] || 0); const ap = (m[3] || '').toLowerCase().replace(/\./g, '');
  if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return { hhmm: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`, raw: m[0] };
}

const NEG = /\b(?:do not|don't|dont|never|avoid|no longer|must not|should not|shouldn't|not to)\b/i;
const NEG_TAKE = /\b(?:do not|don't|dont|never|should not|shouldn't|must not|mustn't|cannot|can't|not)\s+(?:to\s+)?(?:be\s+)?(?:take|taken|use|used|restart|resume|continue|given|give)\b(?!\s+(?:more than|with|on|if|before|after|within|together|at|while|during|until|unless|any more than|for|more)\b)/i;
export function classifyStatus(t) {
  const s = t.replace(/\s+/g, ' ').replace(CAUTION_RX, ' ');
  const doNotStop = /\b(?:do not|don't|never|must not|should not)\s+(?:stop|discontinue|skip)\b/i.test(s);
  const doNotMiss = /\b(?:do not|don't|never)\s+(?:forget|miss)\b/i.test(s);
  const stopUntil = /\b(?:stop|do not take|don't take|hold|pause|withhold)\b[^.;]*\buntil\b/i.test(s) && !doNotStop;
  const hold = /\b(?:hold|holding|withhold|withheld|held|on hold|hold off|pause[d]?|temporarily stop|skip)\b/i.test(s) && !/\b(?:do not|don't|never)\s+(?:skip|hold)\b/i.test(s);
  const negTake = NEG_TAKE.test(s);
  const stop = !doNotStop && (/\b(?:stop(?:ped)?|discontinue[d]?|no longer take|cease|omit(?:ted)?)\b/i.test(s) || negTake || /\b(?:not|no longer)\b[^.;]*\bany ?more\b/i.test(s));
  const start = /\b(?:start(?:ing)?|begin(?:ning)?|new medicine|new medication|initiate)\b/i.test(s);
  const cont = doNotStop || doNotMiss || /\b(?:continue|keep taking|resume|restart|carry on)\b/i.test(s);
  const change = /\b(?:increase[d]?|decrease[d]?|reduce[d]?|change[d]?|switch(?:ed)?|instead of|new dose|adjust(?:ed)?|previously|formerly)\b/i.test(s);
  const take = /\b(?:take|use|apply|inject|inhale|give)\b/i.test(s) && !negTake;
  let status = 'UNKNOWN';
  if (stopUntil || (hold && !stop)) status = 'HOLD';
  else if (stop && start) status = 'CHANGE';
  else if (stop) status = 'STOP';
  else if (change) status = 'CHANGE';
  else if (start) status = 'START';
  else if (cont) status = 'CONTINUE';
  return { status, take: take || ['START', 'CONTINUE', 'CHANGE'].includes(status), doNotStop, doNotMiss, condition: (s.match(/\buntil\s+([^.;]+)/i)?.[1] || '').trim() || null };
}

// Negations that ClearCare understands. Anything else containing "not / never / avoid" in a
// medicine instruction is flagged instead of being paraphrased.
const BENIGN_NEG = /\b(?:do not|don't|never|must not|should not)\s+(?:exceed|take more than|go over|stop|discontinue|skip|crush|chew|double|forget|miss)\b[^.;]*|\b(?:no|not) more than\b[^.;]*|\bunless\b[^.;]*|\bnot (?:stated|specified|given|listed|included|clear|known)\b/gi;
const CAUTION_RX = /\b(?:do not|don't|never|avoid)\s+(?:taking\s+(?:it\s+|this\s+)?|take\s+(?:it|this|them|this medicine)?\s*)?(?:with|on)\s+(milk|dairy(?: products)?|food|alcohol|an empty stomach|grapefruit(?: juice)?|antacids)\b|\bavoid\s+(alcohol|grapefruit(?: juice)?|dairy|milk)\b/gi;
const RESIDUAL_NEG = /\b(?:not|never|don't|dont|avoid|no longer|shouldn't|mustn't|can't|cannot)\b/i;
const STOP_QUALIFIER = /\b(?:if|when|after|before|once|except|on day|from|starting|tomorrow|tonight|while|during|for \d+|in \d+)\b/i;

function conditionOf(statements) {
  for (const st of statements) {
    if (/\b(?:call|contact|seek|go to|emergency|108|911|112)\b/i.test(st)) continue;
    const m = st.match(/\b(?:only\s+)?if\s+(?:you\s+)?([^.;]+?)(?=[.;]|$)/i);
    if (m) return m[1].trim();
  }
  return null;
}

// ---------- 4. classification ----------
const CATS = [
  ['warning', /\b(?:call (?:911|108|112)|dial (?:911|108|112)|rush to (?:the )?hospital|go to (?:the )?(?:emergency|ER|nearest|hospital)|seek (?:medical|emergency|urgent) (?:help|care|attention)|emergency|right away|immediately)\b/i],
  ['appointment', /\b(?:follow[- ]?up|appointment|see (?:your )?(?:doctor|dr\.?|surgeon|clinician)|clinic visit|review (?:in|at) (?:clinic|OPD)|OPD|return (?:to (?:the )?clinic|in \d+)|visit (?:your|the)|suture removal|stitches? removal|dressing change at)\b/i],
  ['test', /\b(?:blood test|INR test|lab(?:oratory)? test|x-?ray|scan|ECG|EKG|ultrasound|blood work|CBC|LFT|KFT|RFT|HbA1c|check (?:your )?(?:blood sugar|INR)|repeat (?:CBC|INR|blood))\b/i],
  ['warning2', /\b(?:call (?:your|the)|warning signs?)\b/i],
  ['wound', /\b(?:incision|wound|dressing|stitches|sutures|bandage|staples|drain)\b/i],
  ['activity', /\b(?:walk|walking|lift|lifting|drive|driving|exercise|stairs|shower|bath(?:e)?|swim|bed rest|return to work|activity|activities)\b/i],
  ['diet', /\b(?:diet|eat|eating|drink|drinking|fluids|water|salt|sugar|alcohol|food|meals?|fasting)\b/i],
  ['home', /\b(?:bring your|measure|weigh yourself|record|monitor|check your|rest as needed|rest)\b/i],
  ['contact', /\b(?:call|contact)\b[^.]*\b(?:clinic|doctor|pharmacist|care team|provider|hospital)\b|\b(?:phone|telephone|helpline)\b[^.]*\d{6,}/i]
];
const ACTION = /\b(?:rush|dial|review|repeat|return|phone|take|call|follow|keep|walk|avoid|do not|don't|never|return|bring|go|check|rest|eat|drink|see|apply|change|wash|shower|lift|drive|contact|seek|visit|appointment|schedule|book|get|have|limit|use|wear|remove|clean|measure|weigh|record|monitor|stay|sleep|elevate)\b/i;
const META = /^(?:SYNTHETIC DEMO|Patient:|Patient name|Name:|MRN|DOB|Date of birth|Page \d+|Admitted\b|Discharged? home\b|Discharge date|Discharge summary|Example prepared|This synthetic file|Expected behavior|Fictional|NORTHSIDE COMMUNITY HOSPITAL|Hospital:|Ward:|Consultant:)/i;

function severityOf(t) {
  if (/\b(?:911|108|112|emergency|ER\b|ambulance|immediately|right away|nearest hospital|rush to|chest pain|trouble breathing|difficulty breathing|breathless|vomit(?:ing)? blood|fainting|unconscious)\b/i.test(t)) return 'emergency';
  if (/\b(?:bleeding|fever|temperature|swelling|redness|pus|discharge from|severe|worse|vomiting|shortness of breath|black stools|dizziness|signs of infection)\b/i.test(t)) return 'urgent';
  return 'routine';
}

function reason(code, message) { return { code, message }; }

// ---------- 5. main ----------
export function extractInstructions(doc, { method = doc.method || 'plain-text', ocr = method === 'ocr-tesseract' } = {}) {
  const raw = provenanceLines(doc);
  const joined = joinContinuations(raw);
  const plan = { version: PLAN_VERSION, method, discharge: { date: null }, items: [], suspicious: [], other: [], documentWarnings: [...(doc.warnings || [])] };
  let section = '';
  let currentMed = null;
  const medBlocks = new Map();
  const units = [];
  for (const j of joined) {
    if (SECTION_HEADERS.test(j.text) || (j.text.length < 40 && /^[A-Z][A-Za-z /&-]+$/.test(j.text) && j.text.split(' ').length <= 4 && !medNamesIn(j.text).length)) { section = j.text.toLowerCase(); currentMed = null; continue; }
    const dd = j.text.match(/\bDischarge(?:d)?(?: date)?:?\s*(?:home\s*)?(?:on\s*)?([^.]+)/i);
    if (dd && !plan.discharge.date) { const d = parseDate(dd[1]); if (d.iso) plan.discharge.date = d.iso; }
    if (META.test(j.text) || /^manual test cue/.test(section)) { if (!/^manual test cue/.test(section) && !/^(?:SYNTHETIC|Page \d)/i.test(j.text)) plan.other.push({ text: j.text, page: j.page }); continue; }
    for (const sentence of splitSentences(j.text)) {
      if (INJECTION.test(sentence)) { plan.suspicious.push({ text: sentence, page: j.page, lines: [j.lineStart, j.lineEnd], note: 'This text looks like instructions to software or web code, not care instructions. It was not used.' }); continue; }
      units.push({ sentence, page: j.page, lines: [j.lineStart, j.lineEnd], section, lineKey: `${j.page}:${j.lineStart}` });
    }
  }

  // Medications: assign sentences to blocks.
  let lastLineKey = null;
  for (const u0 of units) {
    let u = u0;
    let names = medNamesIn(u.sentence);
    // Two or more medicines in one sentence: either an interaction caution, or a list that must be split
    // so one medicine's dose can never leak into another.
    if (names.length > 1) {
      if (/\btogether\b|\bat the same time\b|\bapart from\b|\bwith (?:your )?\w+\s*$|\binteract|\bcombin|\bseparate(?:ly)?\b|\bgap\b|\bhours? (?:before|after|apart)\b/i.test(u.sentence)) {
        plan.items.push({ id: hashId('caution', u.sentence), category: 'caution', text: u.sentence, names: names.map(n => n.raw), clarity: 'clear', reasons: [], severity: 'routine', provenance: prov(u, method, ocr ? 'low' : 'high') });
        // A dose stated for the FIRST medicine in the same sentence still belongs to it (e.g. "Calcium 500 mg … apart from X").
        const first = names[0];
        const seg = u.sentence.slice(0, names[1].index).replace(/,?\s*(?:\d+\s*hours?\s*)?(?:apart from|with|and|before|after)\s*$/i, '');
        if (/\d/.test(seg) && !NEG.test(seg)) { u = { ...u, sentence: seg.trim() }; names = [first]; }
        else { u0.used = true; currentMed = null; continue; }
      } else {
        const parts = names.map((n, i) => ({ n, text: u.sentence.slice(i === 0 ? 0 : n.index, i + 1 < names.length ? names[i + 1].index : undefined).replace(/^[\s,;:+&-]+|[\s,;:+&-]+(?:and|,)?\s*$/gi, '').trim() }));
        for (const part of parts) {
          const key = part.n.generic;
          if (!medBlocks.has(key)) medBlocks.set(key, { name: part.n, statements: [], allergy: false, historical: false });
          medBlocks.get(key).statements.push({ ...u, sentence: part.text, lineKey: `${u.lineKey}:${part.n.index}` });
        }
        u0.used = true; currentMed = null; lastLineKey = null; continue;
      }
    }
    const inMedSection = /medic|medicine/.test(u.section);
    const allergy = /^allerg/.test(u.section) || /\ballerg(?:y|ic|ies)\b/i.test(u.sentence);
    const historical = /\b(?:history of|previously (?:on|took|taking)|used to take|was taking|past use|prior use)\b/i.test(u.sentence);
    const genericMed = !names.length && /\b(?:take|continue|start|stop|hold|resume)\b[^.]*\b(?:medication|medicine|tablets?|pills?|capsules?|drops?)\b/i.test(u.sentence) && !/\b(?:list|summary|bring)\b/i.test(u.sentence);
    if (names.length) {
      for (const n of names) {
        const key = n.generic;
        if (!medBlocks.has(key)) medBlocks.set(key, { name: n, statements: [], allergy: false, historical: false });
        const b = medBlocks.get(key);
        b.statements.push(u); if (allergy) b.allergy = true; if (historical) b.historical = true;
        if (n.recognized && !b.name.recognized) b.name = n;
      }
      currentMed = names.length === 1 ? medBlocks.get(names[0].generic) : null;
      lastLineKey = u.lineKey; u.used = true; u0.used = true; continue;
    }
    if (genericMed) {
      const key = `unnamed-${u.page}-${u.lines[0]}`;
      medBlocks.set(key, { name: { raw: null, generic: null, recognized: false }, statements: [u], allergy: false, historical: false });
      currentMed = medBlocks.get(key); lastLineKey = u.lineKey; u.used = true; u0.used = true; continue;
    }
    // Attach to the previous medicine ONLY when the sentence is on the same line, or is an explicit
    // note about it. Never attach free-floating lines (e.g. table cells) — that could mis-assign a dose.
    const noteAboutMed = /^(?:note\b|\(|the (?:dose|unit|insulin|medicine)|this (?:medicine|medication|dose|later note)|it\b)/i.test(u.sentence);
    const otherKind = /\b(?:call|contact|phone|telephone|helpline|seek|go to|follow[- ]?up|appointment|emergency|108|911|112)\b/i.test(u.sentence);
    if (currentMed && !otherKind && (u.lineKey === lastLineKey || (inMedSection && noteAboutMed))) { currentMed.statements.push(u); u.used = true; continue; }
    const otherCat = CATS.some(([c, rx]) => ['appointment', 'test', 'warning'].includes(c) && rx.test(u.sentence));
    if (inMedSection && !otherKind && !otherCat && !UNREADABLE.test(u.sentence) && new RegExp(`\\d\\s*(?:${STRENGTH_UNIT}|${QTY_UNIT})\\b|\\b(?:once|twice|daily|BD|TDS|OD|BID|TID|QID|HS)\\b|\\b\\d+\\b`, 'i').test(u.sentence) && !/^(?:note|discharge|patient|date)\b/i.test(u.sentence)) {
      plan.items.push({ id: hashId('med', u.sentence), category: 'medication', name: null, recognized: false, clarity: 'needs_clarification', reasons: [reason('unrecognized_line', 'ClearCare could not tell which medicine this line is about. Read it in the document’s own words and check with your pharmacist.')], provenance: prov(u, method, 'low'), text: u.sentence, schedulable: false, status: 'UNKNOWN', frequency: parseFrequency(u.sentence), abbreviations: [], alternatives: [] });
      u.used = true; currentMed = null; continue;
    }
    if (inMedSection && UNREADABLE.test(u.sentence)) {
      plan.items.push({ id: hashId('med', u.sentence), category: 'medication', name: null, recognized: false, clarity: 'unreadable', reasons: [reason('unreadable', 'Part of this medicine line could not be read. Nothing has been filled in.')], provenance: prov(u, method, 'low'), schedulable: false, status: 'UNKNOWN' });
      u.used = true; continue;
    }
    currentMed = null;
  }

  for (const [, b] of medBlocks) plan.items.push(buildMedication(b, method, ocr));

  // Other categories from unused sentences.
  const appts = [];
  const rest = units.filter(x => !x.used);
  for (let k = 0; k < rest.length; k++) {
    const u = rest[k];
    let t = u.sentence;
    let cat = null;
    if (/\bbring\b/i.test(t)) cat = 'home';
    else if (/\bfollow[- ]?up contact\b|^contact\s*:/i.test(t)) cat = 'contact';
    else if ((/^follow[- ]?up/.test(u.section) && /\b(?:follow|appointment|visit|see|return)\b/i.test(t)) || /^appointment\s*:/i.test(t)) cat = 'appointment';
    else if (/^(?:when to call|warning signs|when to seek)/.test(u.section) && /\b(?:call|seek|go|contact)\b/i.test(t)) cat = 'warning';
    if (!cat && ACTION.test(t)) for (const [c, rx] of CATS) if (rx.test(t)) { cat = c === 'warning2' ? 'warning' : c; break; }
    if (cat === 'warning' && (!/\b(?:call|go|seek|contact|get help)\b/i.test(t) || severityOf(t) === 'routine')) cat = 'contact';
    if (cat === 'contact' && severityOf(t) !== 'routine') cat = 'warning';
    if (!cat && new RegExp(`\\d\\s*(?:${STRENGTH_UNIT}|${QTY_UNIT})\\b|\\b(?:tab|tablet|cap|capsule|syrup|injection|inj|drops?|inhaler|puffs?)\\.?\\s+[A-Z]`, '').test(t) && !/[\u0900-\u097F]/.test(t) && !/\b(?:lift|walk|pounds?|lbs?|kg|minutes?)\b/i.test(t)) {
      plan.items.push({ id: hashId('med', t), category: 'medication', name: null, recognized: false, clarity: 'needs_clarification', reasons: [reason('unrecognized_line', 'ClearCare could not tell which medicine this line is about.')], provenance: prov(u, method, 'low'), text: t, schedulable: false, status: 'UNKNOWN', frequency: parseFrequency(t), abbreviations: [], alternatives: [] });
      continue;
    }
    if (!cat && /[\u0900-\u097F]/.test(t) && /(?:लें|रखें|करें|न करें|मत|जाएँ|जाएं|दिखाएँ|पिएँ|खाएँ)/.test(t)) cat = 'note';
    else if (!cat && /\b(?:tome|tomar|evite|mantenga|llame|camine|no levante|cita)\b/i.test(t)) cat = 'note';
    if (!cat) { plan.other.push({ text: t, page: u.page }); continue; }
    if (cat === 'appointment' || cat === 'test') {
      // Absorb the following sentences that only complete this visit (place, "not specified", etc.).
      while (k + 1 < rest.length) {
        const nx = rest[k + 1];
        const sameLine = nx.lineKey === u.lineKey;
        const sameFollowSection = nx.section === u.section && /^follow/.test(u.section);
        const completes = !parseDate(nx.sentence).iso && !/\bfollow[- ]?up\b|\bappointment\b/i.test(nx.sentence) && (/\b(?:Clinic|Hospital|Center|Centre|Avenue|Street|Road|location|date|time|specified|confirmed)\b/.test(nx.sentence) || UNREADABLE.test(nx.sentence));
        if ((sameLine || sameFollowSection) && completes) { t += ' ' + nx.sentence; u.lines = [u.lines[0], nx.lines[1]]; k++; } else break;
      }
      u.sentence = t;
    }
    const base = { id: hashId(cat, t + u.page), category: cat, text: t, clarity: 'clear', reasons: [], provenance: prov(u, method, ocr ? 'low' : 'high') };
    if (UNREADABLE.test(t)) { base.clarity = 'unreadable'; base.reasons.push(reason('unreadable', 'Part of this instruction could not be read. Nothing has been filled in.')); }
    if (ocr) base.reasons.push(reason('ocr_source', 'Read by OCR from an image. Compare with the paper copy.'));
    if (cat === 'appointment' || cat === 'test') { appts.push(base); Object.assign(base, buildAppointment(t, cat)); }
    else if (cat === 'warning' || cat === 'contact') { base.severity = severityOf(t); }
    else if (cat === 'note') { base.docLang = /[\u0900-\u097F]/.test(t) ? 'hi' : 'es'; base.reasons.push(reason('not_interpreted', 'ClearCare shows this line in the document’s own words; it was not converted into a structured instruction.')); }
    else { base.restriction = NEG.test(t); base.frequency = parseFrequency(t); base.duration = parseDuration(t); }
    plan.items.push(base);
  }

  // Appointment consistency: same kind of visit with different dates = contradiction.
  const byWith = new Map();
  for (const a of appts.filter(a => a.date)) { const k = (a.with || 'visit').toLowerCase(); if (!byWith.has(k)) byWith.set(k, []); byWith.get(k).push(a); }
  for (const list of byWith.values()) if (new Set(list.map(a => a.date + a.time)).size > 1) for (const a of list) { a.clarity = 'needs_clarification'; a.reasons.push(reason('conflicting_appointment', 'The document gives different dates or times for this visit.')); a.schedulable = false; }
  for (const a of appts) if (a.clarity !== 'clear' && a.clarity !== 'unreadable' && !a.reasons.length) a.clarity = 'clear';
  for (const a of appts) { if (a.reasons.some(r => r.code !== 'ocr_source')) a.clarity = a.clarity === 'unreadable' ? 'unreadable' : 'needs_clarification'; a.schedulable = a.clarity === 'clear' && !ocr && Boolean(a.date && a.time && a.location); }
  for (const it of plan.items) if (it.reasons.some(r => r.code === 'ocr_source') && it.clarity === 'clear' && it.category === 'medication') it.clarity = 'needs_clarification';
  plan.summary = summarize(plan);
  return plan;
}

function prov(u, method, confidence) { return { text: u.sentence, page: u.page, lines: u.lines, method, confidence }; }

function buildMedication(b, method, ocr) {
  const text = b.statements.map(s => s.sentence).join(' ');
  const first = b.statements[0];
  const pageSet = [...new Set(b.statements.map(s => s.page))];
  const statementsByLine = new Map();
  for (const s of b.statements) { if (!statementsByLine.has(s.lineKey)) statementsByLine.set(s.lineKey, []); statementsByLine.get(s.lineKey).push(s.sentence); }
  const names = b.name.raw ? [b.name] : [];
  const reasons = [];
  const status = classifyStatus(text);
  const freq = parseFrequency(text);
  const route = parseRoute(text);
  const duration = parseDuration(text);
  const start = parseStart(text);
  const quantity = quantityIn(text);
  const condition = freq.prn ? null : conditionOf(b.statements.map(s => s.sentence));
  const maxDaily = (() => {
    const LIM_UNIT = `(${STRENGTH_UNIT}|doses?|tablets?|capsules?|times)`;
    const m = text.match(new RegExp(`\\b(?:do not|don't|never)\\s+(?:exceed|take more than|go over)\\s+(${NUMTOK})\\s*${LIM_UNIT}?\\s*(?:(?:in|per|a|every|\\/)\\s*(24 hours|day|a day))?|\\b(?:maximum|max\\.?|no more than|not more than|up to)\\s+(?:of\\s+)?(${NUMTOK})\\s*${LIM_UNIT}\\s*(?:(?:in|per|a|every|\\/)\\s*(24 hours|day|a day))?`, 'i'));
    if (!m) return null;
    const v = m[1] || m[4], u = m[2] || m[5] || '', per = m[3] || m[6] || null;
    return { value: parseNumber(v), unit: /^dose/i.test(u) ? 'dose' : /^time/i.test(u) ? 'time' : normUnit(u), per, raw: m[0] };
  })();
  const cautions = [...text.matchAll(CAUTION_RX)].map(m => (m[1] || m[2]).toLowerCase().replace(/^an /, ''));
  const residual = text.replace(CAUTION_RX, ' ').replace(BENIGN_NEG, ' ');
  // Strengths per statement-group (line) to separate sequences from conflicts.
  const groups = [...statementsByLine.values()].map(ss => ss.join(' '));
  let taper = null;
  const allStrengths = [];
  for (const g of groups) {
    const ss = strengthsIn(g, names);
    const isSequence = /\b(?:then|followed by|after that|thereafter|and then|reduce to|decrease to|increase to|taper)\b/i.test(g) && ss.length > 1;
    if (isSequence) {
      const parts = g.split(/\b(?:then|followed by|after that|thereafter|reduce to|decrease to|increase to)\b/i);
      taper = parts.map(p => { const s = strengthsIn(p, names)[0]; const d = parseDuration(p); return s ? { value: s.value, unit: s.unit, unitMissing: s.unitMissing, duration: d.value ? { value: d.value, unit: d.unit } : null, frequency: parseFrequency(p), raw: p.trim() } : null; }).filter(Boolean);
    } else allStrengths.push(...ss);
  }
  const distinct = [...new Map(allStrengths.map(s => [`${s.value ?? s.range?.join('-')}|${s.unit || ''}`, s])).values()];
  const strength = taper ? null : distinct[0] || null;
  const conflicting = !taper && distinct.length > 1;
  const generic = b.name.generic;
  const highRisk = Boolean(generic && HIGH_RISK.has(generic));
  const unreadable = UNREADABLE.test(text);
  if (b.historical || b.allergy) {
    return { id: hashId('mention', text), category: b.allergy ? 'allergy' : 'mention', name: b.name.raw, generic, text, clarity: 'clear', reasons: [], provenance: { text, page: first.page, pages: pageSet, lines: first.lines, method, confidence: ocr ? 'low' : 'high' }, schedulable: false, status: 'UNKNOWN', historical: b.historical };
  }
  if (!b.name.raw) reasons.push(reason('missing_name', 'The document does not name this medicine.'));
  else if (!b.name.recognized) reasons.push(reason('unrecognized_medicine', `ClearCare does not recognise "${b.name.raw}". Check the name with your pharmacist.`));
  if (unreadable) reasons.push(reason('unreadable', 'Part of this medicine instruction could not be read. Nothing has been filled in.'));
  if (conflicting) reasons.push(reason('conflicting_dose', `The document gives different doses (${distinct.map(d => `${fmt(d.value)}${d.unit ? ' ' + d.unit : ''}`).join(' and ')}). Do not guess which one is right.`));
  const anyUnitMissing = (taper || distinct).some(s => s.unitMissing) || /\bunit (?:is )?(?:not stated|missing|not specified)\b/i.test(text);
  if (distinct.some(x => x.range)) reasons.push(reason('dose_range', 'The document gives a range of doses, not one dose. Ask your care team how to decide.'));
  if (distinct.some(x => x.errorProneU)) reasons.push(reason('error_prone_abbreviation', '"U" for units is easy to misread. Confirm the dose.'));
  if (condition && !/\b(?:pain|nausea|vomit|fever|constipat|sleep|anxi|itch|cough|headache|breath|wheez|diarr)\w*/i.test(condition)) reasons.push(reason('conditional', 'This medicine depends on a condition the document describes. Check with your care team how to tell.'));
  if (anyUnitMissing) reasons.push(reason('missing_unit', 'A dose is written without a unit (for example mg). Ask your care team to confirm the complete dose.'));
  const needsDose = status.take && status.status !== 'STOP' && status.status !== 'HOLD';
  if (needsDose && !strength && !taper && !quantity && !conflicting) reasons.push(reason('missing_dose', 'The document does not say how much to take.'));
  if (needsDose && !freq.timesPerDay && !freq.everyHours && !freq.everyHoursRange && !freq.perWeek && !freq.perMonth && !freq.everyOtherDay && !freq.prn && !freq.timing.length && !(taper && taper.length)) reasons.push(reason('missing_frequency', 'The document does not say how often to take it.'));
  const groupStatuses = groups.map(g => classifyStatus(g).status);
  const groupActive = g => { const c = classifyStatus(g); return !['STOP', 'HOLD'].includes(c.status) && (c.take || (/\d/.test(g) && (parseFrequency(g).timesPerDay || parseFrequency(g).timing.length))); };
  const sentences = b.statements.map(x => x.sentence);
  if ((groupStatuses.some(x => x === 'STOP' || x === 'HOLD') && groups.some(groupActive)) || (sentences.some(x => ['STOP', 'HOLD'].includes(classifyStatus(x).status)) && sentences.some(groupActive))) reasons.push(reason('conflicting_status', 'The document both tells you to take and to stop or pause this medicine.'));
  if (['STOP', 'HOLD'].includes(status.status)) {
    const stopStatements = b.statements.map(x => x.sentence).filter(x => ['STOP', 'HOLD'].includes(classifyStatus(x).status));
    if (stopStatements.some(x => STOP_QUALIFIER.test(x.replace(/\buntil\b[^.;]*/i, '')))) reasons.push(reason('conditional_stop', 'The document says to stop or pause this medicine only in certain situations or from a certain time.'));
  } else if (RESIDUAL_NEG.test(residual)) reasons.push(reason('unparsed_negation', 'This instruction contains a “do not” that ClearCare could not place safely.'));
  if (freq.negated && !reasons.some(r => r.code === 'unparsed_negation')) reasons.push(reason('unparsed_negation', 'This instruction contains a “do not” that ClearCare could not place safely.'));
  if (freq.conflict) reasons.push(reason('conflicting_frequency', 'The document gives more than one schedule for this medicine.'));
  if (/\b(?:except|excluding|not on)\b|\b(?:mon|tues|wednes|thurs|fri|satur|sun)days?\b/i.test(text)) reasons.push(reason('weekday_schedule', 'This medicine has a schedule that depends on the day of the week.'));
  if (!needsDose && status.status === 'UNKNOWN' && !strength && !quantity && !taper && !conflicting && b.name.raw) reasons.push(reason('missing_dose', 'The document does not say how much to take.'));
  if (!needsDose && status.status === 'UNKNOWN' && (strength || quantity) && !freq.timesPerDay && !freq.everyHours && !freq.everyHoursRange && !freq.perMonth && !freq.perWeek && !freq.everyOtherDay && !freq.prn && !freq.timing.length && !taper && !conflicting) reasons.push(reason('missing_frequency', 'The document does not say how often to take it.'));
  if (status.status === 'CHANGE') reasons.push(reason('change', 'The document describes a change to this medicine. Make sure you know which instruction is current.'));
  for (const s of distinct) { if (/^\.\d/.test(s.raw)) reasons.push(reason('naked_decimal', `"${s.raw}" is written without a leading zero, which is easy to misread. Confirm it means 0${s.raw}.`)); if (/\d\.0\b/.test(s.raw)) reasons.push(reason('trailing_zero', `"${s.raw}" has a trailing zero, which can be misread as ten times the dose. Confirm the dose.`)); if (/\d,\d{1,2}\b/.test(s.raw)) reasons.push(reason('decimal_comma', `"${s.raw}" uses a decimal comma. Confirm the dose.`)); }
  for (const a of freq.errorProne) reasons.push(reason('error_prone_abbreviation', `"${a}" is an abbreviation that is easy to misread. Confirm what it means for this medicine.`));
  if (highRisk) reasons.push(reason('high_risk_review', 'This is a high-alert medicine. ClearCare keeps it on the list to check with your care team and does not set reminders for it.'));
  if (ocr) reasons.push(reason('ocr_source', 'Read by OCR from an image. Compare every number with the paper copy.'));
  const blocking = reasons.filter(r => r.code !== 'change' || true);
  const clarity = unreadable ? 'unreadable' : blocking.length ? 'needs_clarification' : 'clear';
  const active = !['STOP', 'HOLD'].includes(status.status);
  const schedulable = clarity === 'clear' && active && !freq.prn && !condition && !freq.everyOtherDay && !freq.perMonth && !freq.perWeek && Boolean(freq.timesPerDay) && !taper && !start?.delay && !strength?.range;
  const abbreviations = ABBREVIATIONS.filter(a => a.meaning && a.rx.test(text)).map(a => ({ key: a.key, meaning: a.meaning, errorProne: Boolean(a.errorProne) }));
  return {
    id: hashId('med', `${generic || 'unnamed'}:${text}`), category: 'medication', name: b.name.raw, generic, brand: b.name.brand || null, recognized: Boolean(b.name.recognized), highRisk,
    status: status.status, takes: status.take, doNotStop: status.doNotStop, doNotMiss: status.doNotMiss, resumeCondition: status.status === 'HOLD' ? status.condition : null,
    strength: strength ? { value: strength.value, range: strength.range || null, unit: strength.unit, raw: strength.raw, unitMissing: strength.unitMissing } : null,
    alternatives: conflicting ? distinct.map(d => ({ value: d.value, unit: d.unit, raw: d.raw })) : [], taper, quantity, route, frequency: freq, duration, start, condition, maxDaily, cautions,
    abbreviations, text, clarity, reasons, schedulable,
    provenance: { text, page: first.page, pages: pageSet, lines: [first.lines[0], b.statements.at(-1).lines[1]], method, confidence: ocr ? 'low' : clarity === 'clear' ? 'high' : 'medium', statements: b.statements.map(s => ({ text: s.sentence, page: s.page, lines: s.lines })) }
  };
}

function buildAppointment(t, kind) {
  const date = parseDate(t);
  const time = parseTime(t);
  const rel = t.match(new RegExp(`\\b(?:in|after|within)\\s+(${NUMTOK})\\s*(days?|weeks?)\\b`, 'i'));
  const loc = t.match(/\b((?:[A-Z][A-Za-z'&]+\s+){1,4}(?:Clinic|Hospital|Center|Centre|Medical College|Health Centre|Laboratory|Lab))\b(?:,?\s*(\d+[^.]*?(?:Avenue|Street|Road|Lane|Marg|Nagar|Suite[^.]*)))?/);
  const locNegated = /\b(?:location|clinic|place)\s+(?:is\s+)?(?:not (?:specified|stated|given)|to be confirmed|tbd|unknown)\b/i.test(t);
  const withM = t.match(/\b(?:with|see)\s+(?:your\s+)?((?:Dr\.?\s+[A-Z][a-z]+)|[a-z][a-z ]{2,30}?)(?=\s+(?:on|in|at|after|within|(?:${MONTHS}))\b|[,.]|$)/i);
  const reasons = [];
  if (!date.iso && !rel) reasons.push(reason(date.ambiguous ? 'ambiguous_date' : 'missing_date', date.ambiguous ? `The date "${date.raw}" is unclear${date.yearMissing ? ' (no year)' : ' (day and month could be swapped)'}.` : 'The date is not given.'));
  if (rel && !date.iso) reasons.push(reason('relative_date', `The document says "${rel[0]}" but does not give the exact date.`));
  if (!time) reasons.push(reason('missing_time', 'The time is not given.'));
  if (!loc || locNegated) reasons.push(reason('missing_location', 'The place is not given.'));
  if (UNREADABLE.test(t)) reasons.push(reason('unreadable', 'Part of this appointment could not be read.'));
  return { kind, date: date.iso, time: time?.hhmm || null, timeRaw: time?.raw || null, relative: rel ? { value: parseNumber(rel[1]), unit: rel[2].replace(/s$/, '') } : null, location: loc && !locNegated ? [loc[1], loc[2]].filter(Boolean).join(', ') : null, with: withM ? withM[1].trim() : null, clarity: reasons.length ? 'needs_clarification' : 'clear', reasons };
}

function fmt(v) { return Number.isInteger(v) ? String(v) : String(v); }

function summarize(plan) {
  const c = k => plan.items.filter(i => i.category === k);
  return { medications: c('medication').length, appointments: c('appointment').length + c('test').length, warnings: c('warning').length, needsClarification: plan.items.filter(i => i.clarity !== 'clear').length, schedulableMedications: c('medication').filter(m => m.schedulable).length, suspicious: plan.suspicious.length };
}
