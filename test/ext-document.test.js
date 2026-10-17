import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { ingestPdfInNode, ocrPdfInNode, ocrCapabilities, nodeSupportsPdfjs } from '../lib/ext/document-node.js';
import { extractInstructions } from '../public/ext/clinical/engine.js';

const orig = n => readFile(new URL(`../discharge_pdf/${n}`, import.meta.url));
const adv = n => readFile(new URL(`../discharge_pdf_adversarial/${n}`, import.meta.url));
const plan = async (bytes, opts) => extractInstructions(await ingestPdfInNode(bytes, opts));

test('every original fixture parses through the new provider, with page provenance when pdf.js is available', async () => {
  for (const n of (await readdir(new URL('../discharge_pdf/', import.meta.url))).filter(f => f.endsWith('.pdf'))) {
    const doc = await ingestPdfInNode(await orig(n));
    assert.ok(doc.text.length > 60, n);
    if (nodeSupportsPdfjs()) { assert.equal(doc.method, 'pdfjs-text-layer'); assert.equal(doc.pages[0].page, 1); }
  }
});

test('legacy parser fallback still produces the same core findings (OCP: original parser preserved)', async () => {
  const p = await plan(await orig('01_everyday_recovery.pdf'), { preferLegacy: true });
  assert.ok(p.items.some(i => i.name === 'Acetaminophen' && i.strength.value === 500 && i.strength.unit === 'mg'));
  assert.ok(p.items.some(i => i.category === 'appointment' && i.date === '2026-10-20' && i.time === '10:30'));
  assert.equal(p.method, 'legacy-pdf-parser');
});

test('empty, malformed and password-protected files fail clearly and never produce instructions', { skip: !nodeSupportsPdfjs() && 'needs Node >= 22.13 for pdf.js' }, async () => {
  await assert.rejects(ingestPdfInNode(await adv('12_empty.pdf')), e => e.code === 'empty');
  await assert.rejects(ingestPdfInNode(await adv('13_malformed.pdf')), e => e.code === 'malformed' || e.code === 'unreadable');
  await assert.rejects(ingestPdfInNode(await adv('11_password_protected.pdf')), e => e.code === 'encrypted');
  await assert.rejects(ingestPdfInNode(Buffer.from('hello world, not a pdf')), e => e.code === 'not_pdf');
  await assert.rejects(ingestPdfInNode(Buffer.alloc(13 * 1024 * 1024, 32)), e => e.code === 'too_large' || e.code === 'not_pdf');
});

test('scanned image-only PDF is detected as having no text layer (no guessed text)', async () => {
  const doc = await ingestPdfInNode(await adv('10_scanned_image_only.pdf'));
  assert.equal(doc.status, 'no-text');
  assert.equal(extractInstructions(doc).items.length, 0);
});

test('two-page, two-column document keeps columns apart and records page numbers', { skip: !nodeSupportsPdfjs() && 'needs Node >= 22.13 for pdf.js' }, async () => {
  const doc = await ingestPdfInNode(await adv('08_two_page_two_column.pdf'));
  assert.equal(doc.pageCount, 2); assert.equal(doc.pages[0].columns, 2);
  const p = extractInstructions(doc);
  const lis = p.items.find(i => i.name === 'lisinopril');
  assert.equal(lis.frequency.timesPerDay, 1); assert.equal(lis.frequency.prn, false, 'right-column "Rest as needed" must not leak into lisinopril');
  assert.equal(p.items.find(i => i.category === 'appointment').provenance.page, 2);
  assert.match(p.items.find(i => i.category === 'appointment').location, /Northside Family Clinic, 1200 Cedar Avenue/);
});

test('table rows stay together so a frequency is never assigned to the wrong medicine', { skip: !nodeSupportsPdfjs() && 'needs Node >= 22.13 for pdf.js' }, async () => {
  const p = await plan(await adv('17_table_layout.pdf'));
  const by = n => p.items.find(i => i.name?.toLowerCase() === n);
  assert.equal(by('metformin').frequency.timesPerDay, 2);
  assert.deepEqual(by('atorvastatin').frequency.timing, ['bedtime']);
  assert.equal(by('pantoprazole').frequency.timesPerDay, 1);
});

test('sideways text on a rotated page is read in its own direction', { skip: !nodeSupportsPdfjs() && 'needs Node >= 22.13 for pdf.js' }, async () => {
  const p = await plan(await adv('09_rotated_page.pdf'));
  assert.ok(p.items.some(i => i.name === 'amlodipine' && i.strength.value === 5));
  assert.ok(p.items.some(i => i.category === 'appointment' && i.date === '2026-10-28' && i.time === '14:00'));
});

test('mixed English + Hindi document keeps Devanagari lines in their own words', { skip: !nodeSupportsPdfjs() && 'needs Node >= 22.13 for pdf.js' }, async () => {
  const p = await plan(await adv('18_mixed_english_hindi.pdf'));
  const notes = p.items.filter(i => i.category === 'note');
  assert.ok(notes.some(n => n.text.includes('घाव को साफ़ और सूखा रखें')));
  assert.ok(notes.every(n => n.docLang === 'hi'));
  assert.ok(p.items.some(i => i.name === 'paracetamol' && i.frequency.prn));
});

test('local OCR reads the scanned sample and every OCR medicine needs checking', async t => {
  const caps = await ocrCapabilities();
  if (!caps.available) return t.skip(`OCR not available: ${caps.reason}`);
  const doc = await ocrPdfInNode(await adv('10_scanned_image_only.pdf'));
  assert.equal(doc.method, 'ocr-tesseract');
  const p = extractInstructions(doc);
  const med = p.items.find(i => i.category === 'medication');
  assert.ok(med, 'OCR should find the amoxicillin line');
  assert.notEqual(med.clarity, 'clear');
  assert.equal(med.schedulable, false);
  assert.ok(p.items.filter(i => i.category === 'appointment').every(a => a.schedulable === false));
});
