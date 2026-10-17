// Calendar accuracy: does the Calendar Agent put every dated follow-up from the gold documents on the
// right day and time, keep undated ones off the calendar, and invent nothing?   node tools/eval-calendar.mjs
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ingestPdfInNode } from '../lib/ext/document-node.js';
import { extractInstructions } from '../public/ext/clinical/engine.js';
import { pagesFromPlainText } from '../public/ext/document/layout.js';
import { syncCalendarFromPlan } from '../public/ext/calendar/agent-sync.js';
import { GOLD, HELD_OUT } from './eval/extraction-gold.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
let ok = 0, n = 0, invented = 0, undatedSkipped = 0, undated = 0;
for (const [doc, g] of [...Object.entries(GOLD), ...Object.entries(HELD_OUT)]) {
  const plan = extractInstructions(g.text ? pagesFromPlainText(g.text) : await ingestPdfInNode(await readFile(root + doc)));
  const visits = syncCalendarFromPlan(plan, { today: '2026-10-17' }).entries.filter(e => e.kind === 'visit');
  for (const a of g.appts || []) {
    if (a.date) { n++; const v = visits.find(x => x.date === a.date); if (v && (a.time === undefined || v.time === a.time)) ok++; else console.log('MISS', doc, a); }
    else { undated++; if (!visits.length) undatedSkipped++; }
  }
  for (const v of visits) if (!(g.appts || []).some(a => a.date === v.date)) { invented++; console.log('EXTRA', doc, v.date); }
}
console.log(`dated visits on calendar: ${ok}/${n}; undated visits kept off the calendar: ${undatedSkipped}/${undated}; invented calendar visits: ${invented}`);
