// Browser DocumentIngestionProvider: pdf.js (vendored) first, original reader as fallback.
// The file never leaves the browser in this path.
import { extractPdfText as legacyBrowserExtract } from '../../pdf-reader.js';
import { DocumentError, validatePdfBytes, extractPagesWithPdfjs, summarizeExtraction, pagesFromPlainText } from './layout.js';

let pdfjsPromise = null;
function loadPdfjs() {
  if (!pdfjsPromise) pdfjsPromise = import('../../vendor/pdfjs/pdf.min.mjs').then(mod => {
    mod.GlobalWorkerOptions.workerSrc = new URL('../../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
    return mod;
  });
  return pdfjsPromise;
}

export async function ingestPdfInBrowser(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { encryptedHint } = validatePdfBytes(bytes);
  try {
    const pdfjs = await loadPdfjs();
    const result = await extractPagesWithPdfjs(pdfjs, bytes.slice(), { cMapUrl: new URL('../../vendor/pdfjs/cmaps/', import.meta.url).href });
    return summarizeExtraction(result, 'pdfjs-text-layer');
  } catch (err) {
    if (err instanceof DocumentError && err.code === 'encrypted') throw err;
    if (encryptedHint) throw new DocumentError('encrypted', 'This PDF is password-protected. Please save an unprotected copy, or ask the hospital for one.');
    // Fallback to the original, preserved parser.
    try { return pagesFromPlainText(await legacyBrowserExtract(file), 'legacy-pdf-parser'); }
    catch (legacyErr) {
      if (err instanceof DocumentError) throw err;
      if (/no readable embedded text/i.test(legacyErr.message)) return { method: 'legacy-pdf-parser', status: 'no-text', pageCount: null, pages: [], warnings: ['No text layer was found. This may be a scanned document.'], text: '' };
      throw new DocumentError('unreadable', legacyErr.message || 'The PDF could not be read safely.');
    }
  }
}
