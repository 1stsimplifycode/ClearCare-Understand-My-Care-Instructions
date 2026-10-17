import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { extractPdfText } from '../lib/pdf-text.js';
import { extractCarePlan } from '../lib/extract.js';
import { extractPdfText as extractPdfTextInBrowser } from '../public/pdf-reader.js';
import { extractCarePlan as extractCarePlanInBrowser } from '../public/structured-extract.js';

const folder = new URL('../discharge_pdf/', import.meta.url);
async function parse(name) { const bytes = await readFile(new URL(name, folder)); return extractCarePlan(extractPdfText(bytes), name); }

test('everyday recovery PDF extracts medication, care steps, follow-up, and evidence', async () => {
  const result = await parse('01_everyday_recovery.pdf');
  assert.equal(result.mode, 'local-pdf-text');
  assert.ok(result.medications.some(m => m.name === 'Acetaminophen' && m.dose === '500 mg'));
  assert.ok(result.tasks.some(t => /walk for 10 minutes/i.test(t.source)));
  const follow = result.tasks.find(t => t.appointment);
  assert.ok(follow);
  assert.equal(follow.appointment.date, '2026-10-20');
  assert.equal(follow.appointment.location, 'Northside Family Clinic');
  assert.ok(result.medications[0].source.includes('Acetaminophen 500 mg'));
});

test('ambiguous dose is flagged and the original direction is retained', async () => {
  const result = await parse('02_ambiguous_dose.pdf');
  const med = result.medications.find(m => m.name === 'Metoprolol');
  assert.ok(med?.needsReview);
  assert.match(med.source, /Metoprolol 25/);
  assert.match(med.issue, /unit/i);
});

test('conflicting high-risk doses remain unresolved and follow-up is not schedulable', async () => {
  const result = await parse('03_conflicting_warfarin.pdf');
  const med = result.medications.find(m => m.name === 'Warfarin');
  assert.ok(med?.risk && med.needsReview);
  assert.match(med.dose, /5 mg.*2.5 mg/);
  assert.ok(!result.tasks.some(t => t.appointment));
  assert.ok(result.tasks.some(t => t.status === 'review'));
});

test('missing units and insulin trigger review', async () => {
  const result = await parse('04_missing_units_insulin.pdf');
  assert.ok(result.medications.some(m => m.name === 'Amoxicillin' && m.needsReview));
  assert.ok(result.medications.some(m => m.name === 'Insulin' && m.risk && m.needsReview));
  const pickupIds = result.medications.map(m => `pickup-${m.id}`);
  assert.equal(new Set(pickupIds).size, result.medications.length, 'each medication purchase must have its own checklist key');
  assert.ok(result.medications.every(m => m.id), 'extracted medication entries need stable IDs');
});

test('high-risk medication is sent to review and missing appointment location blocks scheduling', async () => {
  const result = await parse('05_high_risk_apixaban.pdf');
  assert.ok(result.medications.some(m => m.name === 'Apixaban' && m.risk && m.needsReview));
  assert.ok(result.tasks.some(t => /appointment/i.test(t.title) && t.status === 'review' && !t.appointment));
});

test('unreadable demo PDF never invents medicine or appointment details', async () => {
  const result = await parse('06_unreadable_scan.pdf');
  assert.equal(result.medications.length, 0);
  assert.ok(!result.tasks.some(t => t.appointment));
  assert.ok(result.tasks.some(t => t.status === 'incomplete' || t.status === 'review'));
});

test('parser rejects malformed PDF data clearly', () => {
  assert.throws(() => extractPdfText(Buffer.from('not a pdf')), /not a readable PDF/i);
});

test('all provided examples are valid single-page PDFs', async () => {
  const names = await readdir(new URL('../discharge_pdf/', import.meta.url));
  assert.equal(names.filter(name => name.endsWith('.pdf')).length, 6);
  for (const name of names.filter(name => name.endsWith('.pdf'))) assert.ok((await parse(name)).source.length > 60);
});

test('browser-side upload path reads and extracts the everyday PDF without an API request', async () => {
  const bytes = await readFile(new URL('01_everyday_recovery.pdf', folder));
  const text = await extractPdfTextInBrowser(new Blob([bytes]));
  const result = extractCarePlanInBrowser(text, '01_everyday_recovery.pdf');
  assert.match(text, /Acetaminophen 500 mg/);
  assert.ok(result.medications.some(m => m.name === 'Acetaminophen'));
  assert.ok(result.tasks.some(t => t.appointment?.date === '2026-10-20'));
});
