// Node DocumentIngestionProvider + OCRProvider.
// pdf.js legacy build (Node >= 22.13) first; the original lib/pdf-text.js parser is the fallback.
import { execFile } from 'node:child_process';
import { mkdtemp, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractPdfText as legacyExtract } from '../pdf-text.js';
import { DocumentError, validatePdfBytes, extractPagesWithPdfjs, summarizeExtraction, pagesFromPlainText } from '../../public/ext/document/layout.js';
import { installDomMatrixShim } from './dom-matrix-shim.js';

const cmapDir = fileURLToPath(new URL('../../public/vendor/pdfjs/cmaps/', import.meta.url));

export function nodeSupportsPdfjs(version = process.versions.node) {
  const [maj, min] = version.split('.').map(Number);
  return maj > 22 || (maj === 22 && min >= 13);
}

let pdfjsPromise = null;
async function loadPdfjs() {
  if (!nodeSupportsPdfjs()) return null;
  if (!pdfjsPromise) pdfjsPromise = (async () => {
    installDomMatrixShim();
    const warn = console.warn, log = console.log; console.warn = () => {}; console.log = () => {};
    try {
      const mod = await import(new URL('../../public/vendor/pdfjs/pdf.min.mjs', import.meta.url).href);
      mod.GlobalWorkerOptions.workerSrc = new URL('../../public/vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
      return mod;
    } finally { console.warn = warn; console.log = log; }
  })().catch(() => null);
  return pdfjsPromise;
}

export async function ingestPdfInNode(buffer, { preferLegacy = false } = {}) {
  const bytes = new Uint8Array(buffer);
  const { encryptedHint } = validatePdfBytes(bytes);
  const pdfjs = preferLegacy ? null : await loadPdfjs();
  let pdfjsError = null;
  if (pdfjs) {
    try {
      return summarizeExtraction(await extractPagesWithPdfjs(pdfjs, bytes.slice(), { cMapUrl: cmapDir + '/' }), 'pdfjs-text-layer');
    } catch (err) {
      if (err instanceof DocumentError && err.code === 'encrypted') throw err;
      pdfjsError = err;
    }
  }
  if (encryptedHint) throw new DocumentError('encrypted', 'This PDF is password-protected. Please save an unprotected copy, or ask the hospital for one.');
  try { return pagesFromPlainText(legacyExtract(Buffer.from(bytes)), 'legacy-pdf-parser'); }
  catch (err) {
    if (pdfjsError instanceof DocumentError && pdfjsError.code === 'malformed') throw pdfjsError;
    if (/no readable embedded text/i.test(err.message)) return { method: 'legacy-pdf-parser', status: 'no-text', pageCount: null, pages: [], warnings: ['No text layer was found. This may be a scanned document.'], text: '' };
    throw new DocumentError('unreadable', err.message);
  }
}

// ---------- OCR (optional, local) ----------
function run(cmd, args, timeout = 30000) {
  return new Promise((resolve, reject) => execFile(cmd, args, { timeout, maxBuffer: 8 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => err ? reject(Object.assign(err, { stderr })) : resolve(String(stdout))));
}

let ocrInfo = null;
export async function ocrCapabilities() {
  if (ocrInfo) return ocrInfo;
  const info = { available: false, engine: 'tesseract', languages: [], rasterizer: 'pdftoppm', reason: '' };
  try {
    await run('pdftoppm', ['-v'], 5000).catch(e => { if (e.code === 'ENOENT') throw e; });
    const langs = await run('tesseract', ['--list-langs'], 5000);
    info.languages = langs.split(/\r?\n/).slice(1).map(s => s.trim()).filter(l => ['eng', 'hin', 'spa'].includes(l));
    info.available = info.languages.includes('eng');
    if (!info.available) info.reason = 'Tesseract is installed but English language data is missing.';
  } catch (err) {
    info.reason = err.code === 'ENOENT' ? 'Local OCR tools (tesseract and pdftoppm) are not installed on this computer.' : 'Local OCR tools could not be started.';
  }
  return (ocrInfo = info);
}
export function resetOcrCapabilitiesForTests() { ocrInfo = null; }

export async function ocrPdfInNode(buffer, { maxPages = 10 } = {}) {
  const caps = await ocrCapabilities();
  if (!caps.available) throw new DocumentError('ocr_unavailable', caps.reason);
  validatePdfBytes(new Uint8Array(buffer));
  const dir = await mkdtemp(join(tmpdir(), 'clearcare-ocr-'));
  try {
    const pdf = join(dir, 'in.pdf');
    await writeFile(pdf, buffer, { mode: 0o600 });
    await run('pdftoppm', ['-r', '200', '-gray', '-png', '-f', '1', '-l', String(maxPages), pdf, join(dir, 'p')], 60000);
    const images = (await readdir(dir)).filter(f => /^p-\d+\.png$/.test(f)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
    const lang = caps.languages.join('+');
    const pages = [];
    for (const [i, img] of images.entries()) {
      const text = await run('tesseract', [join(dir, img), 'stdout', '-l', lang, '--psm', '4'], 60000);
      const lines = text.split(/\r?\n/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
      pages.push({ page: i + 1, lines, columns: 1, rotation: 0, hasImage: true, hasText: lines.length > 0, imageOnly: false });
    }
    const out = summarizeExtraction({ pages, pageCount: pages.length, warnings: ['Text was read from an image by OCR. OCR can misread numbers (for example 0.5 and 5). Every medicine read this way needs checking against the paper copy.'] }, 'ocr-tesseract');
    out.ocrLanguages = caps.languages;
    return out;
  } finally { await rm(dir, { recursive: true, force: true }); }
}
