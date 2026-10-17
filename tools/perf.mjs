// Performance measurements (Node). Before = ORIGINAL pipeline (lib/pdf-text.js + lib/extract.js).
// After = new pipeline (pdf.js provider + clinical engine + render + briefing). Medians of N runs.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { extractPdfText } from '../lib/pdf-text.js';
import { extractCarePlan } from '../lib/extract.js';
import { ingestPdfInNode } from '../lib/ext/document-node.js';
import { extractInstructions } from '../public/ext/clinical/engine.js';
import { renderItem } from '../public/ext/clinical/render.js';
import { buildDay, buildBriefing } from '../public/ext/calendar/briefing.js';
const N = 15, med = a => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
const time = async fn => { const t = performance.now(); await fn(); return performance.now() - t; };
const rows = [];
await ingestPdfInNode(readFileSync(new URL('../discharge_pdf/01_everyday_recovery.pdf', import.meta.url))); // warm-up (module load)
for (const dir of ['discharge_pdf', 'discharge_pdf_adversarial']) for (const f of readdirSync(new URL(`../${dir}/`, import.meta.url)).filter(x => x.endsWith('.pdf')).sort()) {
  const buf = readFileSync(new URL(`../${dir}/${f}`, import.meta.url));
  const before = []; let beforeOk = true;
  for (let i = 0; i < N; i++) before.push(await time(() => { try { extractCarePlan(extractPdfText(buf), f); } catch { beforeOk = false; } }));
  const ingest = [], engine = [], out = []; let ok = true, doc = null, plan = null;
  for (let i = 0; i < N; i++) {
    try { ingest.push(await time(async () => { doc = await ingestPdfInNode(buf); })); } catch { ok = false; break; }
    engine.push(await time(() => { plan = extractInstructions(doc); }));
    out.push(await time(() => { for (const it of plan.items) for (const l of ['en', 'es', 'hi']) renderItem(it, l, 'simple'); for (const l of ['en', 'es', 'hi']) buildBriefing(buildDay(plan, { date: '2026-10-17' }), { lang: l }); }));
  }
  rows.push({ file: `${dir}/${f}`, bytes: buf.length, originalPipelineMs: beforeOk ? +med(before).toFixed(2) : 'failed (original parser cannot read)', newIngestMs: ok ? +med(ingest).toFixed(2) : 'rejected (by design)', engineMs: ok ? +med(engine).toFixed(2) : null, render3LangPlusBriefingMs: ok ? +med(out).toFixed(2) : null });
}
const mem = process.memoryUsage();
const result = { ranAt: new Date().toISOString(), node: process.versions.node, runsPerFile: N, rows, rssMB: +(mem.rss / 1048576).toFixed(1), heapUsedMB: +(mem.heapUsed / 1048576).toFixed(1) };
mkdirSync(new URL('../docs/evidence/', import.meta.url), { recursive: true });
writeFileSync(new URL('../docs/evidence/perf.json', import.meta.url), JSON.stringify(result, null, 2));
console.table(rows); console.log('RSS MB', result.rssMB, 'heap MB', result.heapUsedMB);
