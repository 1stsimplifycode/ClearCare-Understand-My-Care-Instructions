const HIGH_RISK = new Set(['insulin', 'warfarin', 'apixaban', 'rivaroxaban', 'heparin', 'oxycodone', 'hydrocodone', 'morphine', 'fentanyl', 'tacrolimus', 'cyclosporine', 'prednisone']);
const KNOWN = ['acetaminophen', 'metoprolol', 'warfarin', 'amoxicillin', 'insulin', 'apixaban', 'rivaroxaban', 'heparin', 'oxycodone', 'hydrocodone', 'morphine', 'fentanyl', 'tacrolimus', 'cyclosporine', 'prednisone'];
const UNIT = /\b(?:mg|mcg|μg|g|mL|ml|units?|IU|tablets?|capsules?)\b/i;

export function validateExtraction(value) {
  if (!value || typeof value !== 'object' || typeof value.source !== 'string' || !Array.isArray(value.medications) || !Array.isArray(value.tasks)) throw new Error('Extraction did not match the expected care-plan structure.');
  for (const med of value.medications) if (!['name', 'dose', 'schedule', 'source', 'status'].every(k => typeof med[k] === 'string') || typeof med.risk !== 'boolean') throw new Error('A medication field is missing or malformed.');
  for (const task of value.tasks) if (!['title', 'detail', 'source', 'status'].every(k => typeof task[k] === 'string')) throw new Error('A care-step field is missing or malformed.');
  return value;
}

function linesOf(source) { return source.split(/\n+/).map(s => s.trim()).filter(Boolean).reduce((lines, line) => { if (/^(?:in \d+ hours?|avenue|street|road|suite\b|\d+\s+[A-Z])/i.test(line) && lines.length) lines[lines.length - 1] += ` ${line}`; else if (lines.length && /\bfollow up\b/i.test(lines.at(-1)) && /^(?:[A-Z][a-z]+\s+){1,4}(?:Clinic|Hospital|Center|Centre)\b/.test(line)) lines[lines.length - 1] += ` ${line}`; else lines.push(line); return lines; }, []); }
function lineFor(lines, rx) { return lines.find(line => rx.test(line)) || ''; }
function parseDateTime(line) {
  const dateMatch = line.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i);
  const timeMatch = line.match(/\b(\d{1,2}:\d{2}\s*[AP]M)\b/i);
  if (!dateMatch || !timeMatch) return null;
  const date = new Date(`${dateMatch[1]} ${dateMatch[2]}, ${dateMatch[3]} 12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return { date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`, time: timeMatch[1].toUpperCase().replace(/\s+/, ' ') };
}

export function extractCarePlan(source, filename = 'Uploaded document.pdf') {
  if (typeof source !== 'string' || source.length < 60) throw new Error('Document text is too short to extract a safe care plan.');
  const lines = linesOf(source);
  const medications = [];
  for (const name of KNOWN) {
    const relevant = lines.filter(line => new RegExp(`\\b${name}\\b`, 'i').test(line));
    if (!relevant.length) continue;
    const sourceText = [...new Set(relevant)].join(' ');
    const doseLine = relevant.find(line => UNIT.test(line) || /\b\d+(?:\.\d+)?\b/.test(line)) || relevant[0];
    const doseMatch = doseLine.match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|μg|g|mL|ml|units?|IU|tablets?|capsules?)?\b/i);
    const dose = doseMatch?.[0]?.trim() || 'Not clear in document';
    const hasNumber = /\d/.test(dose);
    const missingUnit = hasNumber && !UNIT.test(dose);
    const doses = [...sourceText.matchAll(new RegExp(`\\b${name}\\b[^.\\n]{0,80}?\\b(\\d+(?:\\.\\d+)?\\s*(?:mg|mcg|μg|g|mL|ml|units?|IU|tablets?|capsules?)?)`, 'gi'))].map(m => m[1].trim().toLowerCase().replace(/\s+/g, ' '));
    const conflicting = new Set(doses).size > 1;
    const risk = HIGH_RISK.has(name);
    const needsReview = missingUnit || conflicting || risk || !hasNumber;
    const frequency = sourceText.match(/\b(?:once|twice|three times|four times|every\s+\d+\s+hours?|daily|at bedtime|before dinner|with meals|as needed)[^.\n]*/i)?.[0]?.trim() || 'Schedule not clear in document';
    let issue = '';
    if (conflicting) issue = 'The document includes different doses for this medicine. Ask your care team which instruction to follow.';
    else if (missingUnit) issue = 'A dose is written without a unit. Ask your care team to confirm the complete dose.';
    else if (risk) issue = 'This medicine is on the high-risk review list. Ask your care team to review the instruction before relying on it.';
    else if (!hasNumber) issue = 'The dose is unclear in this document. Ask your care team to confirm it.';
    // A stable per-medication ID keeps its pickup checkbox independent from every other item.
    medications.push({ id: name, name: name[0].toUpperCase() + name.slice(1), dose: conflicting ? `${[...new Set(doses)].join(' / ')} (conflicting)` : missingUnit ? `${dose} (unit missing)` : dose, schedule: frequency, source: sourceText, risk, needsReview, status: needsReview ? 'review' : 'confirmed', issue });
  }

  const tasks = [];
  const unreadableTokens = /\[(?:unreadable|illegible|date illegible|time illegible)\]/i;
  const sourceDegraded = unreadableTokens.test(source);
  for (const line of lines) {
    if (/\b(?:walk|incision|wound|keep .*clean|call your clinic|call clinic|contact .*clinic|bring your medication|rest as needed)\b/i.test(line)) {
      const title = /walk/i.test(line) ? 'Take a short walk' : /incision|wound/i.test(line) ? 'Follow incision care instructions' : /bring/i.test(line) ? 'Bring your medication list to your visit' : /rest/i.test(line) ? 'Rest as needed' : 'Contact your clinic if you have a question';
      tasks.push({ title, detail: line, source: line, status: unreadableTokens.test(line) ? 'incomplete' : 'confirmed' });
    }
  }
  const followupLines = lines.filter(line => /\bfollow up\b|\bfollow-up\s+(?:in|with|at)\b/i.test(line));
  if (followupLines.length) {
    const exact = followupLines.join(' ');
    const when = parseDateTime(exact);
    const locationLine = lines.find(line => /\b(?:Northside Family Clinic|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}\s+(?:Clinic|Hospital|Center|Centre))\b/.test(line)) || '';
    const location = locationLine.match(/\b(?:Northside Family Clinic|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}\s+(?:Clinic|Hospital|Center|Centre))\b/)?.[0] || '';
    const complete = Boolean(when && location);
    const sourceText = followupLines.join(' ');
    tasks.push({ title: 'Follow-up appointment', detail: complete ? `${when.date} at ${when.time} · ${location}` : 'Appointment details are incomplete. Ask your care team to confirm the date, time, and location.', source: sourceText, status: complete ? 'confirmed' : 'review', ...(complete ? { appointment: { title: 'Follow-up appointment', ...when, location } } : { issue: 'Date, time, or location is missing; this visit cannot be scheduled yet.' }) });
  }
  if (!medications.length && !tasks.length) tasks.push({ title: 'Ask for help reading this document', detail: 'No clear medication or care instructions could be extracted.', source: lines.slice(0, 3).join(' ') || '[No readable source text.]', status: 'incomplete' });
  if (sourceDegraded && !tasks.some(t => t.status === 'incomplete')) tasks.push({ title: 'Check unreadable instructions with your care team', detail: 'Some values in the document are illegible. No missing details have been filled in.', source: lines.find(line => unreadableTokens.test(line)) || '[Document contains unreadable text.]', status: 'incomplete' });
  return validateExtraction({ source, filename, medications, tasks, mode: 'local-pdf-text', incomplete: !medications.length && !tasks.length });
}
