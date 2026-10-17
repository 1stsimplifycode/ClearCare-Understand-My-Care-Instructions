// Page-layout interpretation shared by the browser and Node providers.
// Input: pdf.js text items already transformed into viewport space (y grows downward).
// Output: reading-order lines per page, with two-column detection.

export class DocumentError extends Error {
  constructor(code, message) { super(message); this.code = code; this.name = 'DocumentError'; }
}

export const LIMITS = Object.freeze({ maxBytes: 12 * 1024 * 1024, maxPages: 50, maxLineChars: 2000 });

export function validatePdfBytes(bytes) {
  if (!bytes || !bytes.length) throw new DocumentError('empty', 'This file is empty. Please choose the discharge PDF again.');
  if (bytes.length > LIMITS.maxBytes) throw new DocumentError('too_large', 'This PDF is larger than the 12 MB limit.');
  const head = latin1(bytes.subarray(0, Math.min(1024, bytes.length)));
  if (!head.includes('%PDF-')) throw new DocumentError('not_pdf', 'This file is not a readable PDF.');
  const tail = latin1(bytes.subarray(Math.max(0, bytes.length - 4096)));
  return { encryptedHint: /\/Encrypt\s/.test(tail) || /\/Encrypt\s+\d+\s+\d+\s+R/.test(latin1(bytes.subarray(0, Math.min(bytes.length, 65536)))) };
}

function latin1(u8) { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return s; }

function groupIntoLines(items) {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  for (const it of sorted) {
    const tol = Math.max(2, it.h * 0.45);
    const line = lines.find(l => Math.abs(l.y - it.y) <= tol);
    if (line) line.items.push(it); else lines.push({ y: it.y, items: [it] });
  }
  lines.sort((a, b) => a.y - b.y);
  return lines.map(l => {
    const parts = l.items.sort((a, b) => a.x - b.x);
    let text = '', prevEnd = null;
    for (const p of parts) {
      if (prevEnd !== null && p.x - prevEnd > Math.max(1.5, p.h * 0.2) && !/\s$/.test(text) && !/^\s/.test(p.str)) text += ' ';
      text += p.str; prevEnd = p.x + p.w;
    }
    return { y: l.y, x: parts[0]?.x ?? 0, text: text.replace(/\s+/g, ' ').trim().slice(0, LIMITS.maxLineChars) };
  }).filter(l => l.text);
}

// Find vertical gutters that most text avoids. One gutter = two prose columns; two or more
// gutters = a table whose rows must stay together.
export function detectGutters(items, width) {
  const textItems = items.filter(i => i.str.trim());
  if (textItems.length < 6 || !width) return [];
  const minX = Math.min(...textItems.map(i => i.x)), maxX = Math.max(...textItems.map(i => i.x + i.w));
  const ok = [];
  for (let g = minX + (maxX - minX) * 0.15; g <= minX + (maxX - minX) * 0.85; g += width * 0.005) {
    const crossing = textItems.filter(i => i.x < g - 2 && i.x + i.w > g + 2).length;
    const left = textItems.filter(i => i.x + i.w <= g).length, right = textItems.filter(i => i.x >= g).length;
    ok.push(crossing / textItems.length <= 0.1 && left >= textItems.length * 0.15 && right >= textItems.length * 0.15 ? g : null);
  }
  const runs = []; let cur = [];
  for (const g of ok) { if (g !== null) cur.push(g); else if (cur.length) { runs.push(cur); cur = []; } }
  if (cur.length) runs.push(cur);
  return runs.filter(r => r.length >= 3).map(r => r[Math.floor(r.length / 2)]).filter(g => {
    const ly = textItems.filter(i => i.x + i.w <= g).map(i => i.y), ry = textItems.filter(i => i.x >= g).map(i => i.y);
    return Math.min(Math.max(...ly), Math.max(...ry)) - Math.max(Math.min(...ly), Math.min(...ry)) > 0;
  });
}
export function detectGutter(items, width) { const g = detectGutters(items, width); return g.length === 1 ? g[0] : null; }

export function linesFromItems(items, width) {
  const gutters = detectGutters(items, width);
  if (gutters.length !== 1) return { lines: groupIntoLines(items).map(l => l.text), columns: gutters.length > 1 ? 'table' : 1 };
  const gutter = gutters[0];
  const crossing = items.filter(i => i.x < gutter - 2 && i.x + i.w > gutter + 2);
  const left = items.filter(i => !crossing.includes(i) && i.x + i.w / 2 < gutter);
  const right = items.filter(i => !crossing.includes(i) && i.x + i.w / 2 >= gutter);
  const colTop = Math.min(...[...left, ...right].map(i => i.y));
  const above = crossing.filter(i => i.y < colTop), below = crossing.filter(i => i.y >= colTop);
  const lines = [...groupIntoLines(above), ...groupIntoLines(left), ...groupIntoLines(right), ...groupIntoLines(below)].map(l => l.text);
  return { lines, columns: 2 };
}

// Rotate item coordinates into the text's own reading frame (handles sideways text).
export function toReadingFrame(items) {
  const counts = new Map();
  for (const it of items) { if (!it.str.trim()) continue; const k = it.angle; counts.set(k, (counts.get(k) || 0) + it.str.length); }
  const angle = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
  if (!angle) return { items, angle: 0 };
  const r = angle * Math.PI / 180, ux = Math.cos(r), uy = Math.sin(r), vx = -uy, vy = ux;
  return { angle, items: items.map(it => ({ ...it, x: it.x0 * ux + it.y0 * uy, y: it.x0 * vx + it.y0 * vy })) };
}

const IMAGE_OPS = ['paintImageXObject', 'paintInlineImageXObject', 'paintImageMaskXObject', 'paintImageXObjectRepeat'];

export async function extractPagesWithPdfjs(pdfjs, data, { cMapUrl } = {}) {
  let doc;
  try {
    doc = await pdfjs.getDocument({ data, isEvalSupported: false, disableFontFace: true, verbosity: 0, stopAtErrors: false, ...(cMapUrl ? { cMapUrl, cMapPacked: true } : {}) }).promise;
  } catch (err) {
    if (err?.name === 'PasswordException') throw new DocumentError('encrypted', 'This PDF is password-protected. Please open it with its password and save an unprotected copy, or ask the hospital for one.');
    throw new DocumentError('malformed', 'This PDF appears damaged or uses a format that could not be read safely.');
  }
  const warnings = [];
  const pageCount = doc.numPages;
  const limit = Math.min(pageCount, LIMITS.maxPages);
  if (pageCount > limit) warnings.push(`Only the first ${limit} of ${pageCount} pages were read.`);
  const imageOps = new Set(IMAGE_OPS.map(n => pdfjs.OPS[n]).filter(v => v !== undefined));
  const pages = [];
  for (let n = 1; n <= limit; n++) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items = tc.items.filter(it => typeof it.str === 'string').map(it => {
      const m = pdfjs.Util.transform(viewport.transform, it.transform);
      const h = Math.hypot(m[2], m[3]) || Math.abs(it.height) || 10;
      const angle = (Math.round(Math.atan2(m[1], m[0]) * 180 / Math.PI / 90) * 90 + 360) % 360;
      return { str: it.str, x: m[4], y: m[5], x0: m[4], y0: m[5], w: Math.abs(it.width || 0), h, angle };
    });
    const frame = toReadingFrame(items);
    let hasImage = false;
    try { const ops = await page.getOperatorList(); hasImage = ops.fnArray.some(f => imageOps.has(f)); } catch { warnings.push(`Page ${n}: drawing operators could not be inspected.`); }
    const { lines, columns } = linesFromItems(frame.items, frame.angle % 180 ? viewport.height : viewport.width);
    const textChars = lines.join('').replace(/\s/g, '').length;
    pages.push({ page: n, lines, columns, rotation: page.rotate || 0, textAngle: frame.angle, hasImage, hasText: textChars > 0, imageOnly: hasImage && textChars < 20 });
    page.cleanup?.();
  }
  await doc.destroy?.();
  return { pages, pageCount, warnings };
}

export function summarizeExtraction(result, method) {
  const textPages = result.pages.filter(p => p.hasText).length;
  const imagePages = result.pages.filter(p => p.imageOnly).map(p => p.page);
  const status = textPages === 0 ? 'no-text' : imagePages.length ? 'partial' : 'ok';
  const warnings = [...(result.warnings || [])];
  if (imagePages.length) warnings.push(`Page${imagePages.length > 1 ? 's' : ''} ${imagePages.join(', ')} look${imagePages.length > 1 ? '' : 's'} like a scanned image with no text layer.`);
  if (result.pages.some(p => p.columns === 2)) warnings.push('A two-column layout was detected; reading order was reconstructed column by column. Compare with the original.');
  if (result.pages.some(p => p.columns === 'table')) warnings.push('A table was detected; each row was kept together. Compare with the original.');
  if (result.pages.some(p => p.rotation || p.textAngle)) warnings.push('A rotated page or sideways text was detected and read in the text’s own direction. Compare with the original.');
  return { method, status, pageCount: result.pageCount, pages: result.pages, warnings, text: result.pages.map(p => p.lines.join('\n')).join('\n') };
}

// Wrap legacy single-string text (original parser, synthetic demos) as one page with unknown number.
export function pagesFromPlainText(text, method = 'plain-text') {
  const lines = String(text || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
  return { method, status: lines.length ? 'ok' : 'no-text', pageCount: 1, pages: [{ page: null, lines, columns: 1, rotation: 0, hasImage: false, hasText: lines.length > 0, imageOnly: false }], warnings: method === 'legacy-pdf-parser' ? ['Read with the basic built-in PDF parser; page numbers are not available.'] : [], text: lines.join('\n') };
}
