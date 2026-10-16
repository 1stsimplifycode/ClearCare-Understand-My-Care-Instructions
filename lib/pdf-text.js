import zlib from 'node:zlib';

function decodeAscii85(input) {
  const s = input.toString('ascii').replace(/\s/g, '').replace(/^<~/, '').replace(/~>$/, '');
  const out = [];
  for (let i = 0; i < s.length;) {
    if (s[i] === 'z') { out.push(0, 0, 0, 0); i++; continue; }
    const group = s.slice(i, i + 5); i += 5;
    if (!group) break;
    let value = 0n;
    for (let j = 0; j < 5; j++) value = value * 85n + BigInt(j < group.length ? group.charCodeAt(j) - 33 : 84);
    const bytes = [Number((value >> 24n) & 255n), Number((value >> 16n) & 255n), Number((value >> 8n) & 255n), Number(value & 255n)];
    out.push(...bytes.slice(0, group.length === 5 ? 4 : group.length - 1));
  }
  return Buffer.from(out);
}

function decodePdfString(raw) {
  if (!raw) return '';
  if (raw[0] === '<' && raw.at(-1) === '>') {
    const bytes = Buffer.from(raw.slice(1, -1).replace(/\s/g, ''), 'hex');
    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return bytes.subarray(2).toString('utf16be');
    return bytes.toString('latin1');
  }
  const s = raw.slice(1, -1);
  const bytes = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\') {
      const n = s[++i];
      if (n === undefined) break;
      if (/[0-7]/.test(n)) { let oct = n; for (let j = 0; j < 2 && /[0-7]/.test(s[i + 1] || ''); j++) oct += s[++i]; bytes.push(parseInt(oct, 8)); continue; }
      const escapes = { n: 10, r: 13, t: 9, b: 8, f: 12, '(': 40, ')': 41, '\\': 92 };
      if (n === '\r' && s[i + 1] === '\n') i++;
      else if (n !== '\r' && n !== '\n') bytes.push(escapes[n] ?? n.charCodeAt(0));
    } else bytes.push(s.charCodeAt(i) & 255);
  }
  return Buffer.from(bytes).toString('latin1');
}

function textFromOperators(stream) {
  const out = [];
  const re = /\(((?:\\.|[^\\)])*)\)\s*Tj|\[((?:.|\n)*?)\]\s*TJ/g;
  for (const match of stream.matchAll(re)) {
    if (match[1] !== undefined) out.push(decodePdfString(`(${match[1]})`));
    else {
      const values = match[2].match(/\(((?:\\.|[^\\)])*)\)|<([0-9A-Fa-f\s]+)>/g) || [];
      out.push(values.map(decodePdfString).join(''));
    }
    out.push('\n');
  }
  return out.join('');
}

export function extractPdfText(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12 || buffer.subarray(0, 5).toString() !== '%PDF-') throw new Error('This file is not a readable PDF.');
  if (buffer.length > 12 * 1024 * 1024) throw new Error('This PDF is larger than the 12 MB demo limit.');
  const raw = buffer.toString('latin1');
  const inline = [];
  const streams = [];
  const re = /<<(.*?)>>\s*stream\r?\n/gs;
  for (const match of raw.matchAll(re)) {
    const start = match.index + match[0].length;
    const end = raw.indexOf('endstream', start);
    if (end < 0) continue;
    let bytes = buffer.subarray(start, end);
    while (bytes.length && (bytes.at(-1) === 10 || bytes.at(-1) === 13)) bytes = bytes.subarray(0, -1);
    let decoded = bytes;
    if (/\/ASCII85Decode/.test(match[1])) {
      try { decoded = decodeAscii85(bytes); } catch { continue; }
    }
    if (/\/FlateDecode/.test(match[1])) {
      try { decoded = zlib.inflateSync(decoded, { maxOutputLength: 24 * 1024 * 1024 }); } catch { continue; }
    } else if (/\/Filter/.test(match[1])) continue;
    streams.push(textFromOperators(decoded.toString('latin1')));
  }
  const text = [...inline, ...streams].join('\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
  if (text.length < 60) throw new Error('This PDF has no readable embedded text. A scanned-image OCR service is not configured.');
  return text;
}
